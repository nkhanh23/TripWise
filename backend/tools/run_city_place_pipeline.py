#!/usr/bin/env python
"""City Place Pipeline CLI Tool for TripWise.

Automates raw/source city data processing into staging + dedup + moderation queue.
Supports both FOURSQUARE_OS_PLACES and OSM_GEOFABRIK.
Does NOT publish/apply to public places/hotels.
"""

import argparse
import sys
import os
import re
import json
import time
import hashlib
import math
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse, quote
import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# Foursquare category path keyword matching
# Uses word boundaries to avoid false positives like "pub" matching "public".
# ---------------------------------------------------------------------------
_FSQ_FOOD_KEYWORDS = [
    "dining", "restaurant", "cafe", "coffee", "tea", "bar", "pub",
    "bakery", "food court", "food and beverage retail"
]
_FSQ_HOTEL_KEYWORDS = [
    "lodging", "hotel", "resort", "motel", "hostel", "apartment"
]
_FSQ_ATTRACTION_KEYWORDS = [
    "spiritual", "temple", "pagoda", "landmark", "outdoor", "park",
    "museum", "art", "entertainment", "historic", "attraction",
    "beach", "waterfall", "peak", "cave", "viewpoint"
]


def _match_fsq_keyword(path_lower: str, keyword: str) -> bool:
    """Match a keyword with word boundaries to prevent false positives.
    
    Example: "pub" matches "bar & pub" but NOT "public transportation".
    Multi-word keywords (e.g. "food court") are matched as complete phrases.
    """
    pattern = r'\b' + re.escape(keyword) + r'\b'
    return bool(re.search(pattern, path_lower))


def _classify_fsq_path(path: str) -> str | None:
    """Classify a Foursquare category path into a PlaceType.
    
    Returns FOOD, HOTEL, ATTRACTION, SERVICE, or None if path is empty.
    Matching uses word boundaries — not bare substring — for safety.
    """
    if not path or not path.strip():
        return None
    path_lower = path.lower().strip()
    
    if any(_match_fsq_keyword(path_lower, kw) for kw in _FSQ_HOTEL_KEYWORDS):
        return "HOTEL"
    if any(_match_fsq_keyword(path_lower, kw) for kw in _FSQ_FOOD_KEYWORDS):
        return "FOOD"
    if any(_match_fsq_keyword(path_lower, kw) for kw in _FSQ_ATTRACTION_KEYWORDS):
        return "ATTRACTION"
    
    return "SERVICE"


def build_admin_queue_url(import_run_id: int, province: str, city: str) -> str:
    """Build RFC 3986-compatible admin staging moderation URL.

    Percent-encodes province and city so spaces and non-ASCII characters are
    always safe in query parameters, regardless of the calling step.

    Example:
        build_admin_queue_url(51, "Khanh Hoa", "Nha Trang")
        → "/admin/staging-moderation?importRunId=51&province=Khanh%20Hoa&city=Nha%20Trang"
    """
    return (
        f"/admin/staging-moderation"
        f"?importRunId={import_run_id}"
        f"&province={quote(province, safe='')}"
        f"&city={quote(city, safe='')}"
    )

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run City Place Pipeline to import, deduplicate, and moderate source data into staging queue."
    )
    parser.add_argument(
        "--source", 
        default="FOURSQUARE_OS_PLACES", 
        choices=["FOURSQUARE_OS_PLACES", "OSM_GEOFABRIK"],
        help="Source dataset name (FOURSQUARE_OS_PLACES or OSM_GEOFABRIK)."
    )
    parser.add_argument("--province", required=True, help="Target province name.")
    parser.add_argument("--city", required=True, help="Target city name.")
    parser.add_argument("--input", help="Path to JSONL/NDJSON input file.")
    parser.add_argument("--import-run-id", type=int, help="Use existing import-run-id instead of importing new.")
    parser.add_argument("--release-date", default="2026-06-11", help="Release date in YYYY-MM-DD.")
    parser.add_argument("--bbox", help="Bounding box format: minLat,minLng,maxLat,maxLng")
    parser.add_argument("--limit", type=int, help="Limit number of processed records.")
    parser.add_argument(
        "--step", 
        default="all", 
        choices=["all", "import", "dedup", "moderation", "report"],
        help="Pipeline step to run: all, import, dedup, moderation, report."
    )
    parser.add_argument("--dry-run", action="store_true", default=False, help="Dry-run mode (no DB writes).")
    parser.add_argument("--confirm-write-staging", action="store_true", help="Confirm writing to staging tables.")
    parser.add_argument("--batch-size", type=int, default=1000, help="Batch size for DB writes.")
    parser.add_argument("--report-limit", type=int, default=50, help="Max records in report lists.")
    
    # Check for illegal args matching apply/write-public/publish
    raw_args = sys.argv[1:]
    illegal_patterns = [r"apply", r"write.*public", r"publish"]
    for arg in raw_args:
        for pat in illegal_patterns:
            if re.search(pat, arg, re.IGNORECASE):
                parser.error(f"Illegal parameter detected: '{arg}'. The pipeline tool does not support writing to public tables or publishing.")
                
    return parser.parse_args()

def safe_print(msg):
    print(msg.encode('ascii', errors='backslashreplace').decode('ascii'))

def resolve_db_env() -> tuple[str, str | None, str | None]:
    db_url = (
        os.getenv("DB_URL")
        or os.getenv("SPRING_DATASOURCE_URL")
        or os.getenv("JDBC_DATABASE_URL")
    )
    db_username = os.getenv("DB_USERNAME") or os.getenv("SPRING_DATASOURCE_USERNAME")
    db_password = os.getenv("DB_PASSWORD") or os.getenv("SPRING_DATASOURCE_PASSWORD")
    if not db_url:
        raise RuntimeError("Missing DB_URL or SPRING_DATASOURCE_URL environment variable.")
    return db_url, db_username, db_password

def jdbc_to_postgres_dsn(db_url: str) -> str:
    if db_url.startswith("jdbc:"):
        db_url = db_url[5:]
    parsed = urlparse(db_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    return urlunparse(parsed._replace(query=urlencode(query)))

def open_connection():
    db_url, db_username, db_password = resolve_db_env()
    dsn = jdbc_to_postgres_dsn(db_url)
    import psycopg2
    return psycopg2.connect(
        dsn=dsn,
        user=db_username,
        password=db_password
    )

def validate_bbox(bbox_str: str | None) -> tuple[float, float, float, float] | None:
    if not bbox_str:
        return None
    parts = bbox_str.split(",")
    if len(parts) != 4:
        raise ValueError("BBox must be in format: minLat,minLng,maxLat,maxLng")
    try:
        min_lat = float(parts[0])
        min_lng = float(parts[1])
        max_lat = float(parts[2])
        max_lng = float(parts[3])
    except ValueError:
        raise ValueError("BBox coordinates must be numbers")
    if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
        raise ValueError("Latitude must be between -90 and 90")
    if not (-180 <= min_lng <= 180 and -180 <= max_lng <= 180):
        raise ValueError("Longitude must be between -180 and 180")
    if min_lat > max_lat or min_lng > max_lng:
        raise ValueError("minLat must be <= maxLat and minLng must be <= maxLng")
    return min_lat, min_lng, max_lat, max_lng

def get_public_counts(conn) -> tuple[int, int]:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM places")
        places = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM hotels")
        hotels = cur.fetchone()[0]
        return places, hotels

def normalize_name_for_dedup(name: str) -> str:
    n = unicodedata.normalize('NFD', name)
    n = "".join([c for c in n if not unicodedata.combining(c)])
    n = n.lower().replace('đ', 'd')
    return "".join(c for c in n if c.isalnum() or c.isspace()).strip()

def haversine_distance(lat1, lon1, lat2, lon2):
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(delta_lambda/2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_name_similarity(name1: str, name2: str) -> float:
    w1 = set(name1.lower().split())
    w2 = set(name2.lower().split())
    if not w1 or not w2:
        return 0.0
    return len(w1.intersection(w2)) / len(w1.union(w2))

def is_acceptable_name(name: str, s_type: str = "ALL") -> bool:
    if not name or len(name.strip()) < 3:
        return False
    lower_name = name.lower()
    
    # 1. Generic terms
    generic_terms = {
        "unnamed", "beachfront", "annex", "khách sạn", "khach san", 
        "nhà hàng", "nha hang", "quán ăn", "quan an", "cà phê", 
        "ca phe", "coffee", "restaurant", "bar", "pub"
    }
    if lower_name in generic_terms:
        return False
        
    # 2. Check if starts with digits and street-like patterns
    if re.match(r"^\d+\s+[a-zA-Z\s]+$", lower_name):
        return False
        
    # 3. Check for encoding errors
    if "\u00ef" in lower_name or "\u00bf" in lower_name or "\u00bd" in lower_name:
        return False
        
    # 4. Skip code-like names (e.g. LKS6, LKUC9, LKR12...)
    if re.match(r"^[A-Z0-9]+$", name) and any(c.isdigit() for c in name):
        return False
    for word in name.split():
        if re.match(r"^[A-Z]{2,4}\d{1,3}$", word):
            return False
            
    # 5. Skip generic infrastructure name if mapped to FOOD (bến cảng, harbor, port...)
    if s_type == "FOOD":
        generic_infra = {"bến cảng", "harbor", "port", "dock", "pier", "bến tàu", "bến xe", "nhà ga", "sân bay", "ga tàu"}
        if any(term in lower_name for term in generic_infra):
            return False
            
    # 6. Skip one-word ambiguous name if no category context
    ambiguous_single_words = {"emerald", "annex", "beachfront", "diamond", "ruby", "gold", "silver", "sapphire", "plaza", "center", "villa", "resort", "hotel", "motel", "hostel", "apartment", "apartments", "condo", "suite", "suites"}
    if len(name.split()) == 1 and lower_name in ambiguous_single_words:
        return False
        
    # 7. Non-Vietnamese raw names (e.g., pure Russian or Korean or Chinese strings without translation)
    if not re.search(r"[a-zA-Z\u00C0-\u1EF9]", name):
        return False
        
    return True

def map_fsq_category_to_type(path: str) -> str:
    """Classify a Foursquare category path into a PlaceType.
    Uses word-boundary matching via _classify_fsq_path.
    Returns SERVICE as default for any unrecognised category.
    """
    result = _classify_fsq_path(path)
    return result if result is not None else "SERVICE"

def map_osm_tags_to_category(tags: dict) -> tuple[str, str, str] | None:
    # 1. Check FOOD
    amenity = tags.get("amenity")
    if amenity == "restaurant":
        return "FOOD", "restaurant", "Nhà hàng"
    elif amenity == "cafe":
        return "FOOD", "cafe", "Cà phê"
    elif amenity == "fast_food":
        return "FOOD", "fast_food", "Đồ ăn nhanh"
    elif amenity == "bar":
        return "FOOD", "bar", "Quán bar"
    elif amenity == "pub":
        return "FOOD", "pub", "Quán rượu"
    elif amenity == "food_court":
        return "FOOD", "food_court", "Khu ẩm thực"
    elif amenity == "bakery":
        return "FOOD", "bakery", "Tiệm bánh"
        
    # 2. Check HOTEL
    tourism = tags.get("tourism")
    if tourism == "hotel":
        return "HOTEL", "hotel", "Khách sạn"
    elif tourism == "guest_house":
        return "HOTEL", "guest_house", "Nhà nghỉ"
    elif tourism == "hostel":
        return "HOTEL", "hostel", "Nhà tập thể"
    elif tourism == "resort":
        return "HOTEL", "resort", "Khu nghỉ dưỡng"
    elif tourism == "apartment":
        return "HOTEL", "apartment", "Căn hộ"
        
    # 3. Check ATTRACTION
    if tourism == "attraction":
        return "ATTRACTION", "attraction", "Điểm tham quan"
    elif tourism == "museum":
        return "ATTRACTION", "museum", "Bảo tàng"
    elif tourism == "viewpoint":
        return "ATTRACTION", "viewpoint", "Điểm ngắm cảnh"
    elif tourism == "zoo":
        return "ATTRACTION", "zoo", "Vườn thú"
    elif tourism == "theme_park":
        return "ATTRACTION", "theme_park", "Công viên chủ đề"
    elif tourism == "aquarium":
        return "ATTRACTION", "aquarium", "Thủy cung"
        
    historic = tags.get("historic")
    if historic == "monument":
        return "ATTRACTION", "monument", "Tượng đài"
    elif historic == "memorial":
        return "ATTRACTION", "memorial", "Bia kỷ niệm"
    elif historic == "archaeological_site":
        return "ATTRACTION", "archaeological_site", "Khu khảo cổ"
        
    # 4. Check SERVICE
    if tourism == "travel_agency":
        return "SERVICE", "travel_agency", "Đại lý du lịch"
    office = tags.get("office")
    if office == "travel_agent":
        return "SERVICE", "travel_agent", "Văn phòng du lịch"
        
    return None

def parse_osm_row(
    line_dict: dict,
    city_filter: str | None,
    bbox: tuple | None,
    default_city: str | None = None,
    default_province: str | None = None,
) -> dict | None:
    """Parse a single OSM NDJSON row.

    Args:
        line_dict: raw JSON dict from input NDJSON.
        city_filter: normalized city name used for spatial filtering.
        bbox: optional bounding box for spatial pre-filtering.
        default_city: fallback locality value when the record has no valid city/locality field.
                      Populated from CLI --city.  Must NOT be None when city_filter is set.
        default_province: fallback region value when the record has no valid province/region field.
                      Populated from CLI --province.
    """
    # 1. Name extraction
    name = line_dict.get("name")
    tags = line_dict.get("rawTags") or line_dict.get("tags") or {}
    if not name and tags:
        name = tags.get("name") or tags.get("name:vi") or tags.get("name:en")
    if not name or not name.strip():
        return None
    name = name.strip()
    
    # 2. Coordinates
    lat = line_dict.get("latitude") or line_dict.get("lat")
    lng = line_dict.get("longitude") or line_dict.get("lon")
    if lat is None or lng is None:
        return None
    try:
        lat = float(lat)
        lng = float(lng)
    except (ValueError, TypeError):
        return None
        
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
        
    # 3. Spatial Filters
    if bbox:
        min_lat, min_lng, max_lat, max_lng = bbox
        if not (min_lat <= lat <= max_lat and min_lng <= lng <= max_lng):
            return None

    # Extract locality/region from the record, prefer explicit fields then addr tags
    locality = line_dict.get("locality") or line_dict.get("city") or tags.get("addr:city")
    region = line_dict.get("region") or line_dict.get("province") or tags.get("addr:province")

    # Validate: treat generic/empty placeholders as missing
    _UNKNOWN_VALUES = {"unknown", "n/a", "none", "", "null"}
    if locality and locality.strip().lower() in _UNKNOWN_VALUES:
        locality = None
    if region and region.strip().lower() in _UNKNOWN_VALUES:
        region = None
    
    if city_filter:
        loc_norm = normalize_name_for_dedup(locality or "")
        reg_norm = normalize_name_for_dedup(region or "")
        if city_filter not in (loc_norm or "") and city_filter not in (reg_norm or ""):
            addr = line_dict.get("displayAddress") or line_dict.get("address")
            addr_norm = normalize_name_for_dedup(addr or "")
            if city_filter not in (addr_norm or ""):
                return None

    # Fallback locality/region to CLI --city/--province when record has no valid value.
    # This ensures staging records always carry a known city rather than "Unknown"
    # when the operator has explicitly specified the target city and province.
    if not locality:
        locality = default_city  # may still be None if caller did not provide
    if not region:
        region = default_province  # may still be None if caller did not provide
                
    # 4. External ID
    ext_id = line_dict.get("sourceExternalId") or line_dict.get("osm_id") or line_dict.get("id")
    if not ext_id:
        return None
    ext_id = str(ext_id)
    if ext_id.isdigit():
        osm_type = line_dict.get("osm_type") or "node"
        ext_id = f"osm/{osm_type}/{ext_id}"
        
    # 5. Type and Category Mapping
    cat_match = map_osm_tags_to_category(tags)
    if cat_match:
        ptype, cat_id, cat_label = cat_match
    else:
        ptype = "PENDING_ADMIN_REVIEW"
        cat_id = "unmapped"
        cat_label = "Unmapped"
        
        # Infrastructure Reject / Commercial review checks
        if any(k in tags for k in ("highway", "railway", "place")) or tags.get("amenity") in ("fuel", "parking"):
            ptype = "SERVICE"
            cat_id = "infrastructure"
            cat_label = "Infrastructure"
        elif any(k in tags for k in ("shop", "building", "office")):
            ptype = "SERVICE"
            cat_id = "commercial"
            cat_label = "Commercial"

    # Resolve final locality/region, falling back to sentinel "Unknown" only as last resort
    resolved_locality = locality or "Unknown"
    resolved_region = region or "Unknown"
            
    return {
        "source_place_id": ext_id,
        "name": name,
        "latitude": lat,
        "longitude": lng,
        "region": resolved_region,
        "locality": resolved_locality,
        "address": line_dict.get("displayAddress") or line_dict.get("address") or name,
        "place_type_draft": ptype,
        "category_id": cat_id,
        "category_label": cat_label,
        "raw_payload": line_dict,
        "tags": tags
    }

def main():
    args = parse_args()
    import_run_id = args.import_run_id
    
    # A. Validate inputs
    try:
        bbox = validate_bbox(args.bbox)
    except ValueError as e:
        print(f"Error: Invalid BBox: {e}", file=sys.stderr)
        sys.exit(1)
        
    if not args.city or not args.province:
        print("Error: --city and --province are required parameters.", file=sys.stderr)
        sys.exit(1)
        
    # Check staging write requirements
    if (args.step == "import" or (args.step == "all" and not import_run_id)) and not args.dry_run:
        confirm_write = getattr(args, "confirm_write_staging", False)
        if not confirm_write:
            print("Error: Staging DB write requested but --confirm-write-staging is missing.", file=sys.stderr)
            sys.exit(1)
            
    conn = open_connection()
    try:
        places_before, hotels_before = get_public_counts(conn)
        safe_print(f"Public counts before - Places: {places_before}, Hotels: {hotels_before}")
        
        # B. Step: Import Staging
        if args.step == "import" or (args.step == "all" and not import_run_id):
            if not args.input:
                print("Error: --input file path is required for step 'import'.", file=sys.stderr)
                sys.exit(1)
            input_path = Path(args.input)
            if not input_path.exists():
                print(f"Error: Input file not found: {input_path}", file=sys.stderr)
                sys.exit(1)
                
            print(f"\n--- Running Staging Import for {args.source} ---")
            
            if args.source == "FOURSQUARE_OS_PLACES":
                # FSQ uses external subprocess script
                import_script = Path("backend/target/import_fsq_vietnam_staging.py")
                if not import_script.exists():
                    print(f"Error: Import script not found at {import_script}", file=sys.stderr)
                    sys.exit(1)
                    
                cmd = ["python", str(import_script), "--input", str(input_path), "--city", args.city, "--release-date", args.release_date, "--source", args.source, "--batch-size", str(args.batch_size)]
                if args.limit:
                    cmd.extend(["--limit", str(args.limit)])
                if getattr(args, "confirm_write_staging", False) and not args.dry_run:
                    cmd.append("--write-db")
                    
                print("Executing command:", " ".join(cmd))
                proc = subprocess.run(cmd, capture_output=True, text=True)
                if proc.returncode != 0:
                    print("Staging import subprocess failed!", file=sys.stderr)
                    print(proc.stderr, file=sys.stderr)
                    sys.exit(proc.returncode)
                print(proc.stdout)
                
                match = re.search(r"import_run_id:\s*(\d+)", proc.stdout)
                if match:
                    import_run_id = int(match.group(1))
                    
            elif args.source == "OSM_GEOFABRIK":
                # OSM Geofabrik uses built-in Python ingestion adapter
                print("Using built-in OSM parser adapter...")
                city_filter = normalize_name_for_dedup(args.city)
                parsed_rows = []
                
                with open(input_path, "r", encoding="utf-8") as f:
                    for line in f:
                        if args.limit and len(parsed_rows) >= args.limit:
                            break
                        stripped = line.strip()
                        if not stripped:
                            continue
                        try:
                            line_dict = json.loads(stripped)
                        except json.JSONDecodeError:
                            continue
                            
                        # Pass CLI args for fallback locality/region
                        parsed = parse_osm_row(
                            line_dict,
                            city_filter,
                            bbox,
                            default_city=args.city,
                            default_province=args.province
                        )
                        if parsed:
                            parsed_rows.append(parsed)
                            
                print(f"Parsed {len(parsed_rows)} valid OSM rows matching city/bbox filter.")
                
                if not args.dry_run:
                    # Create import run
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO place_import_runs (
                                source_name, input_file, import_mode, status, 
                                processed_count, inserted_count, notes
                            ) VALUES (%s, %s, 'UPSERT_ONLY', 'SUCCESS', %s, %s, %s) 
                            RETURNING id
                        """, (args.source, str(input_path), len(parsed_rows), len(parsed_rows), f"OSM Geofabrik import for {args.city}"))
                        import_run_id = cur.fetchone()[0]
                        print(f"Created place_import_runs ID: {import_run_id}")
                        
                        # Batch insert staging and categories
                        for i in range(0, len(parsed_rows), args.batch_size):
                            batch = parsed_rows[i:i+args.batch_size]
                            for row in batch:
                                r_hash = hashlib.sha256(json.dumps(row["raw_payload"]).encode('utf-8')).hexdigest()
                                norm_n = normalize_name_for_dedup(row["name"])
                                # Resolve release date: use CLI arg, fallback to today
                                release_date_val = args.release_date if args.release_date else None
                                
                                cur.execute("""
                                    INSERT INTO external_place_staging (
                                        import_run_id, source, source_place_id, source_release_date, source_row_hash, 
                                        name, normalized_name, latitude, longitude, geom, 
                                        region, locality, address, place_type_draft, 
                                        needs_admin_review, coordinate_status, validation_status, 
                                        moderation_status, dedup_status, raw_payload
                                    ) VALUES (
                                        %s, %s, %s, %s::date, %s, %s, %s, %s, %s, 
                                        ST_SetSRID(ST_MakePoint(%s, %s), 4326), 
                                        %s, %s, %s, %s, TRUE, 'VALID', 'VALID', 
                                        'PENDING_ADMIN_REVIEW', 'NOT_CHECKED', %s::jsonb
                                    ) RETURNING id
                                """, (
                                    import_run_id, args.source, row["source_place_id"], release_date_val, r_hash,
                                    row["name"], norm_n, row["latitude"], row["longitude"],
                                    row["longitude"], row["latitude"], row["region"], row["locality"],
                                    row["address"], row["place_type_draft"], json.dumps(row["raw_payload"])
                                ))
                                sid = cur.fetchone()[0]
                                
                                cur.execute("""
                                    INSERT INTO external_place_category_staging (
                                        staging_place_id, source_category_id, category_label, 
                                        category_path, is_primary
                                    ) VALUES (%s, %s, %s, %s, TRUE)
                                """, (sid, row["category_id"], row["category_label"], row["category_label"]))
                        conn.commit()
                        print(f"Successfully inserted {len(parsed_rows)} staging records.")
                else:
                    import_run_id = 999999
                    print(f"DRY-RUN: Simulation created temporary import run ID: {import_run_id}")
            
            # Print stable markers for Java parsing at the end of import step
            if not args.dry_run and import_run_id and import_run_id != 999999:
                admin_url = build_admin_queue_url(import_run_id, args.province, args.city)
                print("")
                print(f"PIPELINE_IMPORT_RUN_ID={import_run_id}")
                print(f"PIPELINE_ADMIN_QUEUE_URL={admin_url}")
                print("")
                    
        # Find latest run if not specified
        if not import_run_id and args.step in ("dedup", "moderation", "report", "all"):
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM place_import_runs WHERE source_name = %s ORDER BY id DESC LIMIT 1", (args.source,))
                row = cur.fetchone()
                if row:
                    import_run_id = row[0]
                    print(f"No import_run_id specified. Using latest run id for {args.source}: {import_run_id}")
                else:
                    print(f"Error: No import run found for source {args.source} in DB.", file=sys.stderr)
                    sys.exit(1)

        # C. Step: Dedup
        if args.step in ("dedup", "all") and import_run_id:
            print(f"\n--- Running Deduplication for Import Run ID: {import_run_id} ---")
            
            with conn.cursor() as cur:
                # Load staging places
                cur.execute("""
                    SELECT id, name, latitude, longitude 
                    FROM external_place_staging 
                    WHERE import_run_id = %s AND locality = %s
                """, (import_run_id, args.city))
                staging_places = cur.fetchall()
                if import_run_id == 999999 and args.source == "OSM_GEOFABRIK":
                    staging_places = [(idx, row["name"], row["latitude"], row["longitude"]) for idx, row in enumerate(parsed_rows)]
                print(f"Loaded {len(staging_places)} staging places to deduplicate.")
                
                # Load public places and hotels
                cur.execute("""
                    SELECT id, name, place_type, ST_Y(location::geometry), ST_X(location::geometry) 
                    FROM places 
                    WHERE city = %s OR province = %s
                """, (args.city, args.province))
                public_places = cur.fetchall()
                
                cur.execute("""
                    SELECT id, name, ST_Y(location::geometry), ST_X(location::geometry) 
                    FROM hotels 
                    WHERE city = %s
                """, (args.city,))
                public_hotels = cur.fetchall()
                
                # Load other sources in staging (cross-dedup)
                cur.execute("""
                    SELECT id, name, place_type_draft, latitude, longitude, source 
                    FROM external_place_staging 
                    WHERE locality = %s AND source != %s AND import_run_id != %s
                """, (args.city, args.source, import_run_id))
                other_staging = cur.fetchall()
                
                print(f"Loaded public data for comparison: {len(public_places)} places, {len(public_hotels)} hotels.")
                print(f"Loaded other sources staging data for cross-comparison: {len(other_staging)} records.")
                
                if not args.dry_run and import_run_id != 999999:
                    cur.execute("DELETE FROM external_place_dedup_candidates WHERE staging_place_id IN (SELECT id FROM external_place_staging WHERE import_run_id = %s)", (import_run_id,))
                
                candidates_to_insert = []
                staging_updates = []
                
                for s_id, s_name, s_lat, s_lng in staging_places:
                    s_norm = normalize_name_for_dedup(s_name)
                    cands = []
                    
                    # Compare with places
                    for p_id, p_name, p_type, p_lat, p_lng in public_places:
                        p_norm = normalize_name_for_dedup(p_name)
                        dist = haversine_distance(s_lat, s_lng, p_lat, p_lng)
                        sim = calculate_name_similarity(s_norm, p_norm)
                        
                        is_match = False
                        conf = "LOW"
                        if s_norm == p_norm and dist < 100.0:
                            is_match = True
                            conf = "HIGH"
                        elif sim >= 0.6 and dist < 200.0:
                            is_match = True
                            conf = "MEDIUM"
                        elif dist < 300.0 and (s_norm in p_norm or p_norm in s_norm or sim >= 0.4):
                            is_match = True
                            conf = "LOW"
                            
                        if is_match:
                            cands.append({
                                "existing_place_id": p_id,
                                "matched_staging_place_id": None,
                                "match_type": "SPATIAL_AND_NAME",
                                "match_confidence": conf,
                                "distance_meters": dist,
                                "name_similarity": sim,
                                "evidence": json.dumps({"distance": dist, "name_similarity": sim, "staging_name": s_name, "existing_name": p_name})
                            })
                            
                    # Compare with hotels
                    for h_id, h_name, h_lat, h_lng in public_hotels:
                        h_norm = normalize_name_for_dedup(h_name)
                        dist = haversine_distance(s_lat, s_lng, h_lat, h_lng)
                        sim = calculate_name_similarity(s_norm, h_norm)
                        
                        is_match = False
                        conf = "LOW"
                        if s_norm == h_norm and dist < 100.0:
                            is_match = True
                            conf = "HIGH"
                        elif sim >= 0.6 and dist < 200.0:
                            is_match = True
                            conf = "MEDIUM"
                        elif dist < 300.0 and (s_norm in h_norm or h_norm in s_norm or sim >= 0.4):
                            is_match = True
                            conf = "LOW"
                            
                        if is_match:
                            cands.append({
                                "existing_place_id": h_id,
                                "matched_staging_place_id": None,
                                "match_type": "SPATIAL_AND_NAME",
                                "match_confidence": conf,
                                "distance_meters": dist,
                                "name_similarity": sim,
                                "evidence": json.dumps({"distance": dist, "name_similarity": sim, "staging_name": s_name, "existing_name": h_name})
                            })
                            
                    # Compare with other staging sources (cross-dedup)
                    for o_id, o_name, o_type, o_lat, o_lng, o_src in other_staging:
                        o_norm = normalize_name_for_dedup(o_name)
                        dist = haversine_distance(s_lat, s_lng, o_lat, o_lng)
                        sim = calculate_name_similarity(s_norm, o_norm)
                        
                        is_match = False
                        conf = "LOW"
                        if s_norm == o_norm and dist < 100.0:
                            is_match = True
                            conf = "HIGH"
                        elif sim >= 0.6 and dist < 200.0:
                            is_match = True
                            conf = "MEDIUM"
                        elif dist < 300.0 and (s_norm in o_norm or o_norm in s_norm or sim >= 0.4):
                            is_match = True
                            conf = "LOW"
                            
                        if is_match:
                            cands.append({
                                "existing_place_id": None,
                                "matched_staging_place_id": o_id,
                                "match_type": "CROSS_SOURCE_STAGING",
                                "match_confidence": conf,
                                "distance_meters": dist,
                                "name_similarity": sim,
                                "evidence": json.dumps({"distance": dist, "name_similarity": sim, "staging_name": s_name, "other_staging_name": o_name, "other_source": o_src})
                            })
                            
                    if cands:
                        staging_updates.append((s_id, "CANDIDATE_FOUND"))
                        for c in cands:
                            candidates_to_insert.append((
                                s_id, c["existing_place_id"], c["matched_staging_place_id"], 
                                c["match_type"], c["match_confidence"], c["distance_meters"], 
                                c["name_similarity"], c["evidence"]
                            ))
                    else:
                        staging_updates.append((s_id, "NO_MATCH"))
                        
                print(f"Simulation: Found {len(candidates_to_insert)} duplicate candidates for {len([x for x in staging_updates if x[1] == 'CANDIDATE_FOUND'])} staging places.")
                
                if not args.dry_run and import_run_id != 999999:
                    # Filter out candidates whose existing_place_id no longer exists in places table
                    # (can happen when places are reseeded / IDs change between query and insert)
                    if candidates_to_insert:
                        candidate_place_ids = {c[1] for c in candidates_to_insert if c[1] is not None}
                        if candidate_place_ids:
                            cur.execute(
                                "SELECT id FROM places WHERE id = ANY(%s)",
                                (list(candidate_place_ids),)
                            )
                            valid_place_ids = {row[0] for row in cur.fetchall()}
                            before_count = len(candidates_to_insert)
                            candidates_to_insert = [
                                c for c in candidates_to_insert
                                if c[1] is None or c[1] in valid_place_ids
                            ]
                            skipped = before_count - len(candidates_to_insert)
                            if skipped > 0:
                                print(f"Skipped {skipped} dedup candidates with stale existing_place_id (places no longer present).")

                    psycopg2.extras.execute_batch(cur, """
                        INSERT INTO external_place_dedup_candidates (
                            staging_place_id, existing_place_id, matched_staging_place_id, 
                            match_type, match_confidence, distance_meters, name_similarity, evidence, decision
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'PENDING')
                    """, candidates_to_insert)
                    
                    psycopg2.extras.execute_batch(cur, """
                        UPDATE external_place_staging 
                        SET dedup_status = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, [(status, sid) for sid, status in staging_updates])
                    
                    conn.commit()
                    print("Deduplication status successfully written to database.")
                    
        # D. Step: Moderation
        if args.step in ("moderation", "all") and import_run_id:
            print(f"\n--- Running Rule-Based Moderation for Import Run ID: {import_run_id} ---")
            
            with conn.cursor() as cur:
                # Load staging records
                cur.execute("""
                    SELECT s.id, s.name, s.place_type_draft, s.dedup_status, c.category_path, s.mapping_payload, s.raw_payload
                    FROM external_place_staging s
                    LEFT JOIN external_place_category_staging c ON c.staging_place_id = s.id AND c.is_primary = TRUE
                    WHERE s.import_run_id = %s AND s.locality = %s
                """, (import_run_id, args.city))
                records = cur.fetchall()
                if import_run_id == 999999 and args.source == "OSM_GEOFABRIK":
                    dedup_status_map = dict(staging_updates)
                    records = []
                    for idx, row in enumerate(parsed_rows):
                        status = dedup_status_map.get(idx, "NOT_CHECKED")
                        records.append((
                            idx, row["name"], row["place_type_draft"], status,
                            row["category_id"], {}, row["raw_payload"]
                        ))
                print(f"Loaded {len(records)} records for moderation.")
                
                moderation_updates = []
                for rid, name, ptype, dedup, cat_path, payload, raw_payload in records:
                    resolved_type = ptype
                    if ptype == "PENDING_ADMIN_REVIEW":
                        if args.source == "FOURSQUARE_OS_PLACES":
                            if cat_path:
                                resolved_type = map_fsq_category_to_type(cat_path)
                            else:
                                # Fallback: extract primary label from raw_payload.fsq_category_labels
                                fsq_labels = raw_payload.get("fsq_category_labels") if isinstance(raw_payload, dict) else None
                                if fsq_labels and isinstance(fsq_labels, (list, tuple)) and len(fsq_labels) > 0:
                                    resolved_type = _classify_fsq_path(fsq_labels[0])
                                elif fsq_labels and isinstance(fsq_labels, str) and fsq_labels.strip():
                                    resolved_type = _classify_fsq_path(fsq_labels)
                                else:
                                    resolved_type = "PENDING_ADMIN_REVIEW"
                        elif args.source == "OSM_GEOFABRIK":
                            tags = raw_payload.get("rawTags") or raw_payload.get("tags") or {}
                            cat_match = map_osm_tags_to_category(tags)
                            if cat_match:
                                resolved_type = cat_match[0]
                            else:
                                resolved_type = "PENDING_ADMIN_REVIEW"
                        
                    # Evaluate name quality
                    is_clean = is_acceptable_name(name, resolved_type)
                    
                    # Tags check for OSM
                    has_reject_tags = False
                    has_review_tags = False
                    if args.source == "OSM_GEOFABRIK":
                        tags = raw_payload.get("rawTags") or raw_payload.get("tags") or {}
                        # Auto reject infrastructure
                        if any(k in tags for k in ("highway", "railway", "place")) or tags.get("amenity") in ("fuel", "parking"):
                            has_reject_tags = True
                        elif any(k in tags for k in ("shop", "building", "office")):
                            has_review_tags = True
                            
                    # Determine moderation status
                    if not is_clean or has_reject_tags:
                        mod_status = "REJECTED"
                        decision = "REJECT_CANDIDATE"
                        needs_review = False
                    elif dedup == "CANDIDATE_FOUND" or has_review_tags or resolved_type == "PENDING_ADMIN_REVIEW":
                        mod_status = "PENDING_ADMIN_REVIEW"
                        decision = "PENDING_ADMIN_REVIEW"
                        needs_review = True
                    else:
                        mod_status = "APPROVED_FOR_APPLY"
                        decision = "APPROVED_FOR_APPLY"
                        needs_review = False
                        
                    payload_dict = payload if isinstance(payload, dict) else {}
                    payload_dict["moderationDecision"] = decision
                    payload_dict["moderatedAt"] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
                    
                    moderation_updates.append((
                        mod_status,
                        resolved_type,
                        needs_review,
                        json.dumps(payload_dict),
                        rid
                    ))
                    
                print(f"Simulation Moderation Results:")
                print(f"  APPROVED_FOR_APPLY: {len([x for x in moderation_updates if x[0] == 'APPROVED_FOR_APPLY'])}")
                print(f"  PENDING_ADMIN_REVIEW: {len([x for x in moderation_updates if x[0] == 'PENDING_ADMIN_REVIEW'])}")
                print(f"  REJECTED: {len([x for x in moderation_updates if x[0] == 'REJECTED'])}")
                
                if not args.dry_run and import_run_id != 999999:
                    psycopg2.extras.execute_batch(cur, """
                        UPDATE external_place_staging 
                        SET moderation_status = %s,
                            place_type_draft = %s,
                            needs_admin_review = %s,
                            mapping_payload = %s::jsonb,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, moderation_updates)
                    conn.commit()
                    print("Moderation statuses successfully written to database.")
                    
        # E. Step: Report
        if args.step in ("report", "all") and import_run_id:
            print(f"\n==========================================")
            print(f"      CITY PLACE PIPELINE REPORT")
            print(f"==========================================")
            print(f"Source: {args.source}")
            print(f"City: {args.city}")
            print(f"Province: {args.province}")
            print(f"Import Run ID: {import_run_id}")
            
            if import_run_id == 999999:
                print(f"Total Staging records in run: {len(parsed_rows)}")
                print("Coordinate status breakdown:")
                print(f"  VALID: {len(parsed_rows)}")
                
                # Deduplication status breakdown
                dedup_counts = {}
                for sid, status in staging_updates:
                    dedup_counts[status] = dedup_counts.get(status, 0) + 1
                print("Deduplication status breakdown:")
                for k, v in dedup_counts.items():
                    print(f"  {k}: {v}")
                    
                # Moderation status breakdown
                mod_counts = {}
                for mod_status, resolved_type, needs_review, payload, rid in moderation_updates:
                    mod_counts[mod_status] = mod_counts.get(mod_status, 0) + 1
                print("Moderation status breakdown:")
                for k, v in mod_counts.items():
                    print(f"  {k}: {v}")
                    
                # Place Type draft breakdown
                type_counts = {}
                for mod_status, resolved_type, needs_review, payload, rid in moderation_updates:
                    type_counts[resolved_type] = type_counts.get(resolved_type, 0) + 1
                print("Place Type draft breakdown:")
                for k, v in type_counts.items():
                    print(f"  {k}: {v}")
                    
                # Samples
                def print_sample_list_dry(title, mod_filter):
                    print(f"\nSample {title} (up to {args.report_limit}):")
                    count = 0
                    for idx, (mod_status, resolved_type, needs_review, payload, rid) in enumerate(moderation_updates):
                        if mod_status == mod_filter:
                            if count >= args.report_limit:
                                break
                            name = parsed_rows[rid]["name"]
                            safe_print(f"  - ID: Sim_{rid} | Name: '{name}' | Type: {resolved_type}")
                            count += 1
                            
                print_sample_list_dry("APPROVED_FOR_APPLY", "APPROVED_FOR_APPLY")
                print_sample_list_dry("PENDING_ADMIN_REVIEW", "PENDING_ADMIN_REVIEW")
                print_sample_list_dry("REJECTED", "REJECTED")
            else:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM external_place_staging WHERE import_run_id = %s AND locality = %s", (import_run_id, args.city))
                    total_staging = cur.fetchone()[0]
                    print(f"Total Staging records in run: {total_staging}")
                    
                    cur.execute("SELECT coordinate_status, COUNT(*) FROM external_place_staging WHERE import_run_id = %s AND locality = %s GROUP BY coordinate_status", (import_run_id, args.city))
                    print("Coordinate status breakdown:")
                    for r in cur.fetchall():
                        print(f"  {r[0]}: {r[1]}")
                        
                    cur.execute("SELECT dedup_status, COUNT(*) FROM external_place_staging WHERE import_run_id = %s AND locality = %s GROUP BY dedup_status", (import_run_id, args.city))
                    print("Deduplication status breakdown:")
                    for r in cur.fetchall():
                        print(f"  {r[0]}: {r[1]}")
                        
                    cur.execute("SELECT moderation_status, COUNT(*) FROM external_place_staging WHERE import_run_id = %s AND locality = %s GROUP BY moderation_status", (import_run_id, args.city))
                    print("Moderation status breakdown:")
                    for r in cur.fetchall():
                        print(f"  {r[0]}: {r[1]}")
                        
                    cur.execute("SELECT place_type_draft, COUNT(*) FROM external_place_staging WHERE import_run_id = %s AND locality = %s GROUP BY place_type_draft", (import_run_id, args.city))
                    print("Place Type draft breakdown:")
                    for r in cur.fetchall():
                        print(f"  {r[0]}: {r[1]}")
                        
                    # Samples
                    def print_sample_list(title, query):
                        print(f"\nSample {title} (up to {args.report_limit}):")
                        cur.execute(query, (import_run_id, args.city, args.report_limit))
                        rows = cur.fetchall()
                        for r in rows:
                            safe_print(f"  - ID: {r[0]} | Name: '{r[1]}' | Type: {r[2]}")
                            
                    print_sample_list("APPROVED_FOR_APPLY", "SELECT id, name, place_type_draft FROM external_place_staging WHERE import_run_id=%s AND locality=%s AND moderation_status='APPROVED_FOR_APPLY' LIMIT %s")
                    print_sample_list("PENDING_ADMIN_REVIEW", "SELECT id, name, place_type_draft FROM external_place_staging WHERE import_run_id=%s AND locality=%s AND moderation_status='PENDING_ADMIN_REVIEW' LIMIT %s")
                    print_sample_list("REJECTED", "SELECT id, name, place_type_draft FROM external_place_staging WHERE import_run_id=%s AND locality=%s AND moderation_status='REJECTED' LIMIT %s")
                    
            # Admin UI filter URL — always printed as stable machine-readable markers AND
            # human-readable label so the Java service can parse reliably at any step.
            admin_url = build_admin_queue_url(import_run_id, args.province, args.city)
            print(f"\nSuggested Admin UI Filter URL:")
            print(f"  {admin_url}")
            # Stable markers for Java CityPipelineService parsing
            print("")
            print(f"PIPELINE_IMPORT_RUN_ID={import_run_id}")
            print(f"PIPELINE_ADMIN_QUEUE_URL={admin_url}")
                
        places_after, hotels_after = get_public_counts(conn)
        safe_print(f"\nPublic counts after - Places: {places_after} (diff={places_after - places_before}), Hotels: {hotels_after} (diff={hotels_after - hotels_before})")
        
    finally:
        conn.close()

if __name__ == '__main__':
    main()
