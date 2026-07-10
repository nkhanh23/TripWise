import { useEffect, useMemo, useState } from "react";

const VN_PROVINCE_DISPLAY: Record<string, string> = {
  "An Giang": "An Giang",
  "Ba Ria - Vung Tau": "Bà Rịa - Vũng Tàu",
  "Bac Giang": "Bắc Giang",
  "Bac Kan": "Bắc Kạn",
  "Bac Lieu": "Bạc Liêu",
  "Bac Ninh": "Bắc Ninh",
  "Ben Tre": "Bến Tre",
  "Binh Dinh": "Bình Định",
  "Binh Duong": "Bình Dương",
  "Binh Phuoc": "Bình Phước",
  "Binh Thuan": "Bình Thuận",
  "Ca Mau": "Cà Mau",
  "Can Tho": "Cần Thơ",
  "Cao Bang": "Cao Bằng",
  "Da Nang": "Đà Nẵng",
  "Dak Lak": "Đắk Lắk",
  "Dak Nong": "Đắk Nông",
  "Dien Bien": "Điện Biên",
  "Dong Nai": "Đồng Nai",
  "Dong Thap": "Đồng Tháp",
  "Gia Lai": "Gia Lai",
  "Ha Giang": "Hà Giang",
  "Ha Nam": "Hà Nam",
  "Ha Noi": "Hà Nội",
  "Ha Tinh": "Hà Tĩnh",
  "Hai Duong": "Hải Dương",
  "Hai Phong": "Hải Phòng",
  "Hau Giang": "Hậu Giang",
  "Hoa Binh": "Hòa Bình",
  "Ho Chi Minh": "Thành phố Hồ Chí Minh",
  "Hung Yen": "Hưng Yên",
  "Khanh Hoa": "Khánh Hòa",
  "Kien Giang": "Kiên Giang",
  "Kon Tum": "Kon Tum",
  "Lai Chau": "Lai Châu",
  "Lam Dong": "Lâm Đồng",
  "Lang Son": "Lạng Sơn",
  "Lao Cai": "Lào Cai",
  "Long An": "Long An",
  "Nam Dinh": "Nam Định",
  "Nghe An": "Nghệ An",
  "Ninh Binh": "Ninh Bình",
  "Ninh Thuan": "Ninh Thuận",
  "Phu Tho": "Phú Thọ",
  "Phu Yen": "Phú Yên",
  "Quang Binh": "Quảng Bình",
  "Quang Nam": "Quảng Nam",
  "Quang Ngai": "Quảng Ngãi",
  "Quang Ninh": "Quảng Ninh",
  "Quang Tri": "Quảng Trị",
  "Soc Trang": "Sóc Trăng",
  "Son La": "Sơn La",
  "Tay Ninh": "Tây Ninh",
  "Thai Binh": "Thái Bình",
  "Thai Nguyen": "Thái Nguyên",
  "Thanh Hoa": "Thanh Hóa",
  "Thua Thien Hue": "Thừa Thiên Huế",
  "Tien Giang": "Tiền Giang",
  "Tra Vinh": "Trà Vinh",
  "Tuyen Quang": "Tuyên Quang",
  "Vinh Long": "Vĩnh Long",
  "Vinh Phuc": "Vĩnh Phúc",
  "Yen Bai": "Yên Bái",
};

const VN_CITY_DISPLAY: Record<string, string> = {
  "Long Xuyen": "Long Xuyên",
  "Chau Doc": "Châu Đốc",
  "Tan Chau": "Tân Châu",
  "Vung Tau": "Vũng Tàu",
  "Con Dao": "Côn Đảo",
  "Bac Giang": "Bắc Giang",
  "Bac Kan": "Bắc Kạn",
  "Bac Lieu": "Bạc Liêu",
  "Bac Ninh": "Bắc Ninh",
  "Ben Tre": "Bến Tre",
  "Quy Nhon": "Quy Nhơn",
  "Thu Dau Mot": "Thủ Dầu Một",
  "Dong Xoai": "Đồng Xoài",
  "Phan Thiet": "Phan Thiết",
  "Mui Ne": "Mũi Né",
  "Ca Mau": "Cà Mau",
  "Can Tho": "Cần Thơ",
  "Cao Bang": "Cao Bằng",
  "Da Nang": "Đà Nẵng",
  "Buon Ma Thuot": "Buôn Ma Thuột",
  "Gia Nghia": "Gia Nghĩa",
  "Dien Bien Phu": "Điện Biên Phủ",
  "Bien Hoa": "Biên Hòa",
  "Cao Lanh": "Cao Lãnh",
  "Pleiku": "Pleiku",
  "Ha Giang": "Hà Giang",
  "Phu Ly": "Phủ Lý",
  "Ha Noi": "Hà Nội",
  "Ha Tinh": "Hà Tĩnh",
  "Hai Duong": "Hải Dương",
  "Hai Phong": "Hải Phòng",
  "Vi Thanh": "Vị Thanh",
  "Hoa Binh": "Hòa Bình",
  "Ho Chi Minh": "Thành phố Hồ Chí Minh",
  "Saigon": "Sài Gòn",
  "Hung Yen": "Hưng Yên",
  "Nha Trang": "Nha Trang",
  "Cam Ranh": "Cam Ranh",
  "Rach Gia": "Rạch Giá",
  "Phu Quoc": "Phú Quốc",
  "Ha Tien": "Hà Tiên",
  "Kon Tum": "Kon Tum",
  "Lai Chau": "Lai Châu",
  "Da Lat": "Đà Lạt",
  "Bao Loc": "Bảo Lộc",
  "Lang Son": "Lạng Sơn",
  "Lao Cai": "Lào Cai",
  "Sa Pa": "Sa Pa",
  "Tan An": "Tân An",
  "Nam Dinh": "Nam Định",
  "Vinh": "Vinh",
  "Ninh Binh": "Ninh Bình",
  "Phan Rang - Thap Cham": "Phan Rang - Tháp Chàm",
  "Viet Tri": "Việt Trì",
  "Tuy Hoa": "Tuy Hòa",
  "Dong Hoi": "Đồng Hới",
  "Hoi An": "Hội An",
  "Tam Ky": "Tam Kỳ",
  "Quang Ngai": "Quảng Ngãi",
  "Ha Long": "Hạ Long",
  "Mong Cai": "Móng Cái",
  "Dong Ha": "Đông Hà",
  "Soc Trang": "Sóc Trăng",
  "Son La": "Sơn La",
  "Tay Ninh": "Tây Ninh",
  "Thai Binh": "Thái Bình",
  "Thai Nguyen": "Thái Nguyên",
  "Thanh Hoa": "Thanh Hóa",
  "Sam Son": "Sầm Sơn",
  "Hue": "Huế",
  "My Tho": "Mỹ Tho",
  "Tra Vinh": "Trà Vinh",
  "Tuyen Quang": "Tuyên Quang",
  "Vinh Long": "Vĩnh Long",
  "Vinh Yen": "Vĩnh Yên",
  "Yen Bai": "Yên Bái",
};

const VN_PROVINCES: Record<string, string[]> = {
  "An Giang": ["Long Xuyen", "Chau Doc", "Tan Chau"],
  "Ba Ria - Vung Tau": ["Vung Tau", "Con Dao"],
  "Bac Giang": ["Bac Giang"],
  "Bac Kan": ["Bac Kan"],
  "Bac Lieu": ["Bac Lieu"],
  "Bac Ninh": ["Bac Ninh"],
  "Ben Tre": ["Ben Tre"],
  "Binh Dinh": ["Quy Nhon"],
  "Binh Duong": ["Thu Dau Mot"],
  "Binh Phuoc": ["Dong Xoai"],
  "Binh Thuan": ["Phan Thiet", "Mui Ne"],
  "Ca Mau": ["Ca Mau"],
  "Can Tho": ["Can Tho"],
  "Cao Bang": ["Cao Bang"],
  "Da Nang": ["Da Nang"],
  "Dak Lak": ["Buon Ma Thuot"],
  "Dak Nong": ["Gia Nghia"],
  "Dien Bien": ["Dien Bien Phu"],
  "Dong Nai": ["Bien Hoa"],
  "Dong Thap": ["Cao Lanh"],
  "Gia Lai": ["Pleiku"],
  "Ha Giang": ["Ha Giang"],
  "Ha Nam": ["Phu Ly"],
  "Ha Noi": ["Ha Noi"],
  "Ha Tinh": ["Ha Tinh"],
  "Hai Duong": ["Hai Duong"],
  "Hai Phong": ["Hai Phong"],
  "Hau Giang": ["Vi Thanh"],
  "Hoa Binh": ["Hoa Binh"],
  "Ho Chi Minh": ["Ho Chi Minh", "Saigon"],
  "Hung Yen": ["Hung Yen"],
  "Khanh Hoa": ["Nha Trang", "Cam Ranh"],
  "Kien Giang": ["Rach Gia", "Phu Quoc", "Ha Tien"],
  "Kon Tum": ["Kon Tum"],
  "Lai Chau": ["Lai Chau"],
  "Lam Dong": ["Da Lat", "Bao Loc"],
  "Lang Son": ["Lang Son"],
  "Lao Cai": ["Lao Cai", "Sa Pa"],
  "Long An": ["Tan An"],
  "Nam Dinh": ["Nam Dinh"],
  "Nghe An": ["Vinh"],
  "Ninh Binh": ["Ninh Binh"],
  "Ninh Thuan": ["Phan Rang - Thap Cham"],
  "Phu Tho": ["Viet Tri"],
  "Phu Yen": ["Tuy Hoa"],
  "Quang Binh": ["Dong Hoi"],
  "Quang Nam": ["Hoi An", "Tam Ky"],
  "Quang Ngai": ["Quang Ngai"],
  "Quang Ninh": ["Ha Long", "Mong Cai"],
  "Quang Tri": ["Dong Ha"],
  "Soc Trang": ["Soc Trang"],
  "Son La": ["Son La"],
  "Tay Ninh": ["Tay Ninh"],
  "Thai Binh": ["Thai Binh"],
  "Thai Nguyen": ["Thai Nguyen"],
  "Thanh Hoa": ["Thanh Hoa", "Sam Son"],
  "Thua Thien Hue": ["Hue"],
  "Tien Giang": ["My Tho"],
  "Tra Vinh": ["Tra Vinh"],
  "Tuyen Quang": ["Tuyen Quang"],
  "Vinh Long": ["Vinh Long"],
  "Vinh Phuc": ["Vinh Yen"],
  "Yen Bai": ["Yen Bai"],
};

const STORAGE_KEY = "tripwise_location_selection";

function loadStored(): { province: string; city: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.province === "string" && typeof parsed.city === "string") {
      return parsed;
    }
  } catch {}
  return null;
}

function saveStored(province: string, city: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ province, city }));
  } catch {}
}

const SORTED_PROVINCES = Object.keys(VN_PROVINCES).sort((a, b) => {
  const da = VN_PROVINCE_DISPLAY[a] || a;
  const db = VN_PROVINCE_DISPLAY[b] || b;
  return da.localeCompare(db);
});

type Props = {
  province: string;
  city: string;
  onProvinceChange: (province: string) => void;
  onCityChange: (city: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowEmpty?: boolean;
};

export function LocationSelector({ province, city, onProvinceChange, onCityChange, disabled, required, allowEmpty }: Props) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || (province && city)) return;
    const stored = loadStored();
    if (stored && VN_PROVINCES[stored.province]) {
      onProvinceChange(stored.province);
      if (stored.city && VN_PROVINCES[stored.province].includes(stored.city)) {
        onCityChange(stored.city);
      } else {
        onCityChange("");
      }
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized && province) {
      saveStored(province, city);
    }
  }, [province, city, initialized]);

  const cities = useMemo(() => {
    if (!province || !VN_PROVINCES[province]) return [];
    return [...VN_PROVINCES[province]].sort((a, b) => {
      const da = VN_CITY_DISPLAY[a] || a;
      const db = VN_CITY_DISPLAY[b] || b;
      return da.localeCompare(db);
    });
  }, [province]);

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <div style={{ flex: 1 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>
          Tỉnh/Thành phố {required && <span style={{ color: "#dc2626" }}>*</span>}
        </label>
        <select
          value={province}
          onChange={(e) => {
            const p = e.target.value;
            onProvinceChange(p);
            const cities = VN_PROVINCES[p] || [];
            if (city && !cities.includes(city)) {
              onCityChange(cities[0] || "");
            }
          }}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "2.5px solid #111",
            borderRadius: "10px",
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: disabled ? "#f3f4f6" : "#fff",
          }}
        >
          <option value="">{allowEmpty ? "Toàn quốc" : "Chọn tỉnh/thành phố"}</option>
          {SORTED_PROVINCES.map((p) => (
            <option key={p} value={p}>{VN_PROVINCE_DISPLAY[p] || p}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }}>
          Thành phố {required && <span style={{ color: "#dc2626" }}>*</span>}
        </label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          disabled={disabled || !province}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "2.5px solid #111",
            borderRadius: "10px",
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            backgroundColor: (disabled || !province) ? "#f3f4f6" : "#fff",
          }}
        >
          <option value="">Chọn thành phố</option>
          {cities.map((c) => (
            <option key={c} value={c}>{VN_CITY_DISPLAY[c] || c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
