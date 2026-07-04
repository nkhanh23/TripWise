import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.resolve(__dirname, '..', 'data', 'vietnam-places.ndjson');
const OUTPUT = path.resolve(__dirname, '..', 'data', 'vietnam-places.ndjson'); // overwrite

const NORMALIZE = new Map([
  ['hà nội', 'Hà Nội'], ['thành phố hà nội', 'Hà Nội'], ['tp hà nội', 'Hà Nội'],
  ['hanoi', 'Hà Nội'], ['ha noi', 'Hà Nội'], ['hà nội', 'Hà Nội'],
  ['tp ha noi', 'Hà Nội'], ['hà nọi', 'Hà Nội'], ['hà nôi', 'Hà Nội'],
  ['hà-nội', 'Hà Nội'],
  ['hồ chí minh', 'Hồ Chí Minh'], ['thành phố hồ chí minh', 'Hồ Chí Minh'],
  ['tp hồ chí minh', 'Hồ Chí Minh'], ['tp.hcm', 'Hồ Chí Minh'],
  ['ho chi minh', 'Hồ Chí Minh'], ['ho chi minh city', 'Hồ Chí Minh'],
  ['hcm', 'Hồ Chí Minh'], ['hochiminh city', 'Hồ Chí Minh'],
  ['tp. hồ chí minh', 'Hồ Chí Minh'], ['hồ chí minh city', 'Hồ Chí Minh'],
  ['đà nẵng', 'Đà Nẵng'], ['thành phố đà nẵng', 'Đà Nẵng'],
  ['danang', 'Đà Nẵng'], ['da nang', 'Đà Nẵng'],
  ['đà nẵng', 'Đà Nẵng'], ['tp đà nẵng', 'Đà Nẵng'],
  ['cần thơ', 'Cần Thơ'], ['thành phố cần thơ', 'Cần Thơ'],
  ['can tho', 'Cần Thơ'],
  ['hải phòng', 'Hải Phòng'], ['haiphong', 'Hải Phòng'],
  ['hai phong', 'Hải Phòng'],
  ['an giang', 'An Giang'],
  ['bà rịa - vũng tàu', 'Bà Rịa - Vũng Tàu'],
  ['bà rịa vũng tàu', 'Bà Rịa - Vũng Tàu'],
  ['bà rịa-vũng tàu', 'Bà Rịa - Vũng Tàu'],
  ['ba ria - vung tau', 'Bà Rịa - Vũng Tàu'],
  ['tỉnh bà rịa - vũng tàu', 'Bà Rịa - Vũng Tàu'],
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
  ['cao bằng', 'Cao Bằng'],
  ['đắk lắk', 'Đắk Lắk'], ['dak lak', 'Đắk Lắk'],
  ['đăk lăk', 'Đắk Lắk'], ['daklak', 'Đắk Lắk'],
  ['điện biên', 'Điện Biên'],
  ['đồng nai', 'Đồng Nai'], ['tỉnh đồng nai', 'Đồng Nai'],
  ['tỈnh đồng nai', 'Đồng Nai'],
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
  ['tỉnh lâm đồng', 'Lâm Đồng'],
  ['lạng sơn', 'Lạng Sơn'], ['tỉnh lạng sơn,', 'Lạng Sơn'],
  ['lào cai', 'Lào Cai'], ['lao cai', 'Lào Cai'],
  ['long an', 'Long An'], ['tỉnh long an', 'Long An'],
  ['nam định', 'Nam Định'],
  ['nghệ an', 'Nghệ An'], ['ninh bình', 'Ninh Bình'],
  ['ninh binh', 'Ninh Bình'], ['ninh thuận', 'Ninh Thuận'],
  ['phú thọ', 'Phú Thọ'], ['phú yên', 'Phú Yên'],
  ['phu yen', 'Phú Yên'], ['phu yên', 'Phú Yên'],
  ['quảng bình', 'Quảng Bình'], ['quang binh', 'Quảng Bình'],
  ['tỉnh quảng bình', 'Quảng Bình'],
  ['quảng nam', 'Quảng Nam'], ['quang nam', 'Quảng Nam'],
  ['quang nam province', 'Quảng Nam'],
  ['quảng ngãi', 'Quảng Ngãi'], ['quảng ninh', 'Quảng Ninh'],
  ['quảng trị', 'Quảng Trị'], ['quang tri', 'Quảng Trị'],
  ['sơn la', 'Sơn La'], ['sóc trăng', 'Sóc Trăng'],
  ['tây ninh', 'Tây Ninh'], ['tay ninh', 'Tây Ninh'],
  ['tay ninh provine', 'Tây Ninh'],
  ['thái bình', 'Thái Bình'], ['tỉnh thái bình', 'Thái Bình'],
  ['thái nguyên', 'Thái Nguyên'],
  ['thanh hóa', 'Thanh Hóa'], ['thanh hoá', 'Thanh Hóa'],
  ['thanh hoa', 'Thanh Hóa'],
  ['thừa thiên huế', 'Thừa Thiên Huế'],
  ['thừa thiên - huế', 'Thừa Thiên Huế'],
  ['thua thien hue', 'Thừa Thiên Huế'],
  ['tỉnh thừa thiên huế', 'Thừa Thiên Huế'],
  ['tiền giang', 'Tiền Giang'],
  ['trà vinh', 'Trà Vinh'], ['tỉnh trà vinh', 'Trà Vinh'],
  ['tuyên quang', 'Tuyên Quang'],
  ['vĩnh long', 'Vĩnh Long'], ['vĩnh phúc', 'Vĩnh Phúc'],
  ['yên bái', 'Yên Bái'], ['bạc liêu', 'Bạc Liêu'],
  ['bắc kạn', 'Bắc Kạn'], ['đắk nông', 'Đắk Nông'],
  ['nam đinh', 'Nam Định'], ['sóc trăng', 'Sóc Trăng'],
  ['thái bình', 'Thái Bình'],
]);

function normalizeProvince(raw) {
  if (!raw) return null;
  return NORMALIZE.get(raw.trim().toLowerCase().normalize('NFC')) || null;
}

async function main() {
  const tmp = OUTPUT + '.tmp';
  const rl = readline.createInterface({ input: fs.createReadStream(INPUT) });
  const ws = fs.createWriteStream(tmp);

  let total = 0, normalized = 0, skipped = 0;

  for await (const line of rl) {
    total++;
    const r = JSON.parse(line);
    const orig = r.province;
    if (orig) {
      const norm = normalizeProvince(orig);
      if (norm) {
        r.province = norm;
        normalized++;
      } else {
        r.province = null; // unrecognized → null
        skipped++;
      }
    }
    // Clean up fields not in PlaceImportRecord
    delete r.openingHours;
    delete r.phone;
    delete r.website;
    ws.write(JSON.stringify(r) + '\n');
  }

  ws.end();
  await new Promise((resolve) => ws.on('finish', resolve));

  fs.renameSync(tmp, OUTPUT);
  console.log(`Total: ${total}, Normalized: ${normalized}, Skipped (unrecognized): ${skipped}`);
}

main().catch(console.error);
