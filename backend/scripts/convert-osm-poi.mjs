import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import osmPbf from 'osm-pbf-parser';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PBF_PATH = path.resolve(__dirname, '..', 'data', 'vietnam-latest.osm.pbf');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'data', 'vietnam-places.ndjson');

const RELEVANT_TAG_KEYS = new Set([
  'tourism', 'amenity', 'leisure', 'natural', 'historic', 'shop', 'building',
]);

const RELEVANT_VALUES = {
  tourism: ['museum', 'attraction', 'viewpoint', 'gallery', 'theme_park', 'zoo', 'aquarium', 'amusement_arcade', 'artwork', 'picnic_site'],
  amenity: ['restaurant', 'cafe', 'fast_food', 'pub', 'bar', 'cinema', 'theatre', 'nightclub', 'casino', 'fountain', 'marketplace', 'library', 'food_court', 'ice_cream'],
  leisure: ['park', 'garden', 'sports_centre', 'stadium', 'water_park', 'marina', 'playground', 'nature_reserve', 'golf_course'],
  natural: ['beach', 'bay', 'cape', 'cliff', 'hot_spring', 'peak', 'valley'],
  historic: ['monument', 'castle', 'ruins', 'archaeological_site', 'memorial', 'museum', 'fort', 'tower', 'tomb', 'wayside_shrine', 'wayside_cross'],
  shop: ['mall', 'department_store', 'gift', 'souvenir', 'craft', 'art'],
  building: ['cathedral', 'mosque', 'temple', 'pagoda', 'church', 'shrine', 'stupa', 'synagogue'],
};

function isRelevant(tags) {
  if (!tags) return false;
  for (const [key, validValues] of Object.entries(RELEVANT_VALUES)) {
    const val = tags[key];
    if (val && validValues.includes(val)) return true;
  }
  return false;
}

const PROVINCE_NORMALIZE = new Map([
  // Hà Nội
  ['hà nội', 'Hà Nội'], ['thành phố hà nội', 'Hà Nội'], ['tp hà nội', 'Hà Nội'],
  ['hanoi', 'Hà Nội'], ['ha noi', 'Hà Nội'], ['hà nội', 'Hà Nội'],
  ['tp ha noi', 'Hà Nội'], ['hà nọi', 'Hà Nội'], ['hà nôi', 'Hà Nội'],
  ['hà-nội', 'Hà Nội'],
  // Hồ Chí Minh
  ['hồ chí minh', 'Hồ Chí Minh'], ['thành phố hồ chí minh', 'Hồ Chí Minh'],
  ['tp hồ chí minh', 'Hồ Chí Minh'], ['tp.hcm', 'Hồ Chí Minh'],
  ['ho chi minh', 'Hồ Chí Minh'], ['ho chi minh city', 'Hồ Chí Minh'],
  ['hcm', 'Hồ Chí Minh'], ['hồ chí minh city', 'Hồ Chí Minh'],
  ['hochiminh city', 'Hồ Chí Minh'], ['thành phố hồ chí minh', 'Hồ Chí Minh'],
  ['tp. hồ chí minh', 'Hồ Chí Minh'],
  // Đà Nẵng
  ['đà nẵng', 'Đà Nẵng'], ['thành phố đà nẵng', 'Đà Nẵng'],
  ['danang', 'Đà Nẵng'], ['da nang', 'Đà Nẵng'],
  ['đà nẵng', 'Đà Nẵng'], ['tp đà nẵng', 'Đà Nẵng'],
  // Cần Thơ
  ['cần thơ', 'Cần Thơ'], ['thành phố cần thơ', 'Cần Thơ'],
  ['can tho', 'Cần Thơ'],
  // Hải Phòng
  ['hải phòng', 'Hải Phòng'], ['haiphong', 'Hải Phòng'],
  ['hai phong', 'Hải Phòng'],
  // Others
  ['an giang', 'An Giang'], ['bà rịa - vũng tàu', 'Bà Rịa - Vũng Tàu'],
  ['bà rịa vũng tàu', 'Bà Rịa - Vũng Tàu'], ['bà rịa-vũng tàu', 'Bà Rịa - Vũng Tàu'],
  ['ba ria - vung tau', 'Bà Rịa - Vũng Tàu'], ['tỉnh bà rịa - vũng tàu', 'Bà Rịa - Vũng Tàu'],
  ['bà rịa', 'Bà Rịa - Vũng Tàu'],
  ['bắc giang', 'Bắc Giang'], ['bắc giang fake', 'Bắc Giang'],
  ['bắc ninh', 'Bắc Ninh'], ['bac ninh', 'Bắc Ninh'],
  ['bến tre', 'Bến Tre'], ['tp bến tre', 'Bến Tre'],
  ['bình dương', 'Bình Dương'], ['binh duong', 'Bình Dương'],
  ['bình dương', 'Bình Dương'], ['bình dương', 'Bình Dương'],
  ['bình định', 'Bình Định'], ['binh dinh', 'Bình Định'],
  ['tỉnh bình định', 'Bình Định'],
  ['bình phước', 'Bình Phước'], ['bình thuận', 'Bình Thuận'],
  ['binh thuan', 'Bình Thuận'], ['cà mau', 'Cà Mau'],
  ['cao bằng', 'Cao Bằng'], ['đắk lắk', 'Đắk Lắk'],
  ['dak lak', 'Đắk Lắk'], ['đăk lăk', 'Đắk Lắk'],
  ['daklak', 'Đắk Lắk'],
  ['điện biên', 'Điện Biên'], ['đồng nai', 'Đồng Nai'],
  ['tỉnh đồng nai', 'Đồng Nai'], ['tỈnh đồng nai', 'Đồng Nai'],
  ['tỉnh đồng nai', 'Đồng Nai'],
  ['đồng tháp', 'Đồng Tháp'], ['gia lai', 'Gia Lai'],
  ['hà giang', 'Hà Giang'], ['ha giang', 'Hà Giang'],
  ['hà nam', 'Hà Nam'], ['hà tĩnh', 'Hà Tĩnh'],
  ['hà tĩnh, vietnam', 'Hà Tĩnh'],
  ['hải dương', 'Hải Dương'], ['hậu giang', 'Hậu Giang'],
  ['hòa bình', 'Hòa Bình'], ['hoa binh', 'Hòa Bình'],
  ['hưng yên', 'Hưng Yên'], ['hưng yên province', 'Hưng Yên'],
  ['khánh hòa', 'Khánh Hòa'], ['khanh hoa', 'Khánh Hòa'],
  ['kiên giang', 'Kiên Giang'], ['kien giang', 'Kiên Giang'],
  ['kiến giang, vietnam', 'Kiên Giang'], ['kieng gian', 'Kiên Giang'],
  ['kon tum', 'Kon Tum'], ['lai châu', 'Lai Châu'],
  ['lâm đồng', 'Lâm Đồng'], ['lam dong', 'Lâm Đồng'],
  ['tỉnh lâm đồng', 'Lâm Đồng'], ['lâm đồng', 'Lâm Đồng'],
  ['lạng sơn', 'Lạng Sơn'], ['tỉnh lạng sơn,', 'Lạng Sơn'],
  ['lào cai', 'Lào Cai'], ['lao cai', 'Lào Cai'],
  ['long an', 'Long An'], ['tỉnh long an', 'Long An'],
  ['nam định', 'Nam Định'], ['nghệ an', 'Nghệ An'],
  ['ninh bình', 'Ninh Bình'], ['ninh binh', 'Ninh Bình'],
  ['ninh thuận', 'Ninh Thuận'], ['phú thọ', 'Phú Thọ'],
  ['phú yên', 'Phú Yên'], ['phu yen', 'Phú Yên'],
  ['phu yên', 'Phú Yên'],
  ['quảng bình', 'Quảng Bình'], ['quang binh', 'Quảng Bình'],
  ['tỉnh quảng bình', 'Quảng Bình'],
  ['quảng nam', 'Quảng Nam'], ['quang nam', 'Quảng Nam'],
  ['quang nam province', 'Quảng Nam'], ['quảng nam', 'Quảng Nam'],
  ['quảng ngãi', 'Quảng Ngãi'], ['quảng ninh', 'Quảng Ninh'],
  ['quảng trị', 'Quảng Trị'], ['quang tri', 'Quảng Trị'],
  ['sơn la', 'Sơn La'], ['sơn la', 'Sơn La'],
  ['sóc trăng', 'Sóc Trăng'], ['tây ninh', 'Tây Ninh'],
  ['tay ninh', 'Tây Ninh'], ['tay ninh provine', 'Tây Ninh'],
  ['thái bình', 'Thái Bình'], ['tỉnh thái bình', 'Thái Bình'],
  ['thái nguyên', 'Thái Nguyên'], ['thanh hóa', 'Thanh Hóa'],
  ['thanh hoá', 'Thanh Hóa'], ['thanh hoa', 'Thanh Hóa'],
  ['thừa thiên huế', 'Thừa Thiên Huế'], ['thừa thiên - huế', 'Thừa Thiên Huế'],
  ['thừa thiên huế', 'Thừa Thiên Huế'], ['thua thien hue', 'Thừa Thiên Huế'],
  ['tỉnh thừa thiên huế', 'Thừa Thiên Huế'],
  ['tiền giang', 'Tiền Giang'], ['trà vinh', 'Trà Vinh'],
  ['tỉnh trà vinh', 'Trà Vinh'], ['tuyên quang', 'Tuyên Quang'],
  ['vĩnh long', 'Vĩnh Long'], ['vĩnh phúc', 'Vĩnh Phúc'],
  ['yên bái', 'Yên Bái'], ['bạc liêu', 'Bạc Liêu'],
  ['bắc kạn', 'Bắc Kạn'], ['đắk nông', 'Đắk Nông'],
  ['hưng yên', 'Hưng Yên'], ['lai châu', 'Lai Châu'],
  ['nam đinh', 'Nam Định'], ['ninh binh', 'Ninh Bình'],
  ['phú yên', 'Phú Yên'], ['quảng nam', 'Quảng Nam'],
  ['quảng ngãi', 'Quảng Ngãi'], ['quảng ninh', 'Quảng Ninh'],
  ['sóc trăng', 'Sóc Trăng'], ['sơn la', 'Sơn La'],
  ['tây ninh', 'Tây Ninh'], ['thái bình', 'Thái Bình'],
  ['thái nguyên', 'Thái Nguyên'], ['thanh hóa', 'Thanh Hóa'],
  ['thừa thiên huế', 'Thừa Thiên Huế'],
]);

function normalizeProvince(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().normalize('NFC');
  return PROVINCE_NORMALIZE.get(key) || null;
}

function extractAddr(tags, prefix = 'addr:') {
  const result = {};
  for (const key of ['province', 'city', 'district', 'ward', 'street', 'housenumber', 'postcode']) {
    const k = prefix + key;
    if (tags[k]) result[key] = tags[k];
  }
  if (!result.province && tags['is_in:province']) result.province = tags['is_in:province'];
  if (!result.city && tags['is_in:city']) result.city = tags['is_in:city'];
  if (!result.city && tags['is_in:municipality']) result.city = tags['is_in:municipality'];
  if (!result.city && tags['is_in:town']) result.city = tags['is_in:town'];
  return result;
}

function buildDisplayAddress(addr, name) {
  const parts = [];
  if (addr.street) {
    let s = addr.street;
    if (addr.housenumber) s = `${addr.housenumber} ${s}`;
    parts.push(s);
  }
  if (addr.ward) parts.push(addr.ward);
  if (addr.district) parts.push(addr.district);
  if (addr.city) parts.push(addr.city);
  if (addr.province) parts.push(addr.province);
  if (parts.length === 0 && name) parts.push(name);
  return parts.join(', ');
}

function extractTags(tags) {
  const result = {};
  for (const key of RELEVANT_TAG_KEYS) {
    if (tags[key]) result[key] = tags[key];
  }
  return Object.keys(result).length > 0 ? result : null;
}

function toRecord(item) {
  if (!item.tags || !item.tags.name) return null;
  const name = item.tags.name;
  if (!isRelevant(item.tags)) return null;

  const lat = item.lat ?? item.latitude ?? item.center?.lat;
  const lon = item.lon ?? item.longitude ?? item.center?.lon;
  if (lat == null || lon == null) return null;

  const rawTags = extractTags(item.tags);
  if (!rawTags) return null;

  const addr = extractAddr(item.tags);

  const record = {
    sourceExternalId: `osm/${item.type ?? 'node'}/${item.id}`,
    name,
    latitude: lat,
    longitude: lon,
    rawTags,
    province: normalizeProvince(addr.province),
    city: addr.city || null,
    district: addr.district || null,
    ward: addr.ward || null,
    displayAddress: buildDisplayAddress(addr, name) || null,
    active: true,
    verificationStatus: 'UNVERIFIED',
  };

  if (item.tags.description) record.description = item.tags.description;
  if (item.tags.opening_hours) record.openingHours = item.tags.opening_hours;
  if (item.tags.phone) record.phone = item.tags.phone;
  if (item.tags.website) record.website = item.tags.website;

  return record;
}

async function convert() {
  console.log(`Reading PBF: ${PBF_PATH}`);
  console.log(`Writing NDJSON: ${OUTPUT_PATH}`);

  const ws = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf-8' });
  const rs = fs.createReadStream(PBF_PATH);

  let total = 0;
  let written = 0;
  let skipped = 0;
  let noName = 0;
  let noCoord = 0;
  let noTags = 0;
  let lastLog = 0;

  const transform = new Transform({
    objectMode: true,
    transform(entities, encoding, callback) {
      for (const item of entities) {
        total++;
        if (!item.tags || Object.keys(item.tags).length === 0) { skipped++; continue; }
        if (!item.tags.name) { noName++; continue; }
        const lat = item.lat ?? item.latitude ?? item.center?.lat;
        const lon = item.lon ?? item.longitude ?? item.center?.lon;
        if (lat == null || lon == null) { noCoord++; continue; }

        const record = toRecord(item);
        if (!record) { noTags++; continue; }

        ws.write(JSON.stringify(record) + '\n');
        written++;

        const now = Date.now();
        if (now - lastLog >= 10000) {
          console.log(`Processed: ${total}, Written: ${written}, Skipped: ${skipped}, NoName: ${noName}, NoCoord: ${noCoord}, NoTags: ${noTags}`);
          lastLog = now;
        }
      }
      callback();
    },
  });

  const osmParser = osmPbf();

  try {
    await pipeline(rs, osmParser, transform);
  } finally {
    ws.end();
  }

  console.log(`\n=== Done ===`);
  console.log(`Total entities: ${total}`);
  console.log(`Written records: ${written}`);
  console.log(`Skipped (no tags): ${skipped}`);
  console.log(`Skipped (no name): ${noName}`);
  console.log(`Skipped (no coord): ${noCoord}`);
  console.log(`Skipped (irrelevant tags): ${noTags}`);
  console.log(`Output: ${OUTPUT_PATH}`);
}

convert().catch((err) => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
