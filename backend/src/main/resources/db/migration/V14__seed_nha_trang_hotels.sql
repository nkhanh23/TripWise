INSERT INTO hotels (
    name,
    city,
    location,
    price_level,
    star_rating,
    google_maps_url,
    description,
    is_active
)
SELECT seed.name,
       'Nha Trang',
       ST_GeogFromText(seed.location_wkt),
       seed.price_level,
       seed.star_rating,
       seed.google_maps_url,
       seed.description,
       TRUE
FROM (
    VALUES
        ('InterContinental Nha Trang', 'SRID=4326;POINT(109.2036 12.2450)', 'HIGH', 5, 'https://maps.google.com/?q=InterContinental+Nha+Trang', 'Khach san 5 sao ngay duong Tran Phu, phu hop nghi duong cao cap gan trung tam.'),
        ('Sheraton Nha Trang Hotel & Spa', 'SRID=4326;POINT(109.2028 12.2472)', 'HIGH', 5, 'https://maps.google.com/?q=Sheraton+Nha+Trang+Hotel+%26+Spa', 'Khach san 5 sao co tam nhin bien, thuan tien di bo den cac diem trung tam.'),
        ('Vinpearl Resort Nha Trang', 'SRID=4326;POINT(109.2444 12.2229)', 'HIGH', 5, 'https://maps.google.com/?q=Vinpearl+Resort+Nha+Trang', 'Khu nghi duong tren Hon Tre, phu hop khach muon tra nghiem resort va bai bien rieng.'),
        ('Novotel Nha Trang', 'SRID=4326;POINT(109.1998 12.2387)', 'HIGH', 4, 'https://maps.google.com/?q=Novotel+Nha+Trang', 'Khach san doi dien bai bien Tran Phu, phu hop cap doi va nhom ban muon o khu trung tam.'),
        ('Liberty Central Nha Trang', 'SRID=4326;POINT(109.1987 12.2365)', 'MEDIUM', 4, 'https://maps.google.com/?q=Liberty+Central+Nha+Trang', 'Khach san gan bien va cho dem, tien cho lich trinh an uong va di bo buoi toi.'),
        ('Melissa Hotel Nha Trang', 'SRID=4326;POINT(109.1948 12.2294)', 'MEDIUM', 4, 'https://maps.google.com/?q=Melissa+Hotel+Nha+Trang', 'Khach san khu phia nam Tran Phu, phu hop nghi duong tam trung va di chuyen bang taxi ngan.'),
        ('Galina Hotel & Spa', 'SRID=4326;POINT(109.1957 12.2381)', 'MEDIUM', 4, 'https://maps.google.com/?q=Galina+Hotel+%26+Spa+Nha+Trang', 'Khach san co dich vu spa, nam trong khu vuc nhieu nha hang va dich vu du lich.'),
        ('Dendro Gold Hotel', 'SRID=4326;POINT(109.1941 12.2282)', 'MEDIUM', 4, 'https://maps.google.com/?q=Dendro+Gold+Hotel+Nha+Trang', 'Khach san gan bai bien khu nam, phu hop gia dinh muon o khu yen hon trung tam mot chut.'),
        ('Gosia Hotel Nha Trang', 'SRID=4326;POINT(109.1949 12.2317)', 'MEDIUM', 3, 'https://maps.google.com/?q=Gosia+Hotel+Nha+Trang', 'Khach san tam trung, di bo duoc ra bien va de ket hop cac diem vui choi khu Tran Phu.'),
        ('Aaron Hotel Nha Trang', 'SRID=4326;POINT(109.1962 12.2351)', 'LOW', 3, 'https://maps.google.com/?q=Aaron+Hotel+Nha+Trang', 'Khach san gia hop ly gan bien va cho dem, phu hop nguoi dung uu tien tiet kiem.'),
        ('Maple Hotel & Apartment', 'SRID=4326;POINT(109.1979 12.2361)', 'MEDIUM', 4, 'https://maps.google.com/?q=Maple+Hotel+%26+Apartment+Nha+Trang', 'Khach san can ho phu hop nhom nho hoac gia dinh can phong rong va vi tri trung tam.'),
        ('Venue Hotel Nha Trang Beach', 'SRID=4326;POINT(109.1971 12.2404)', 'LOW', 3, 'https://maps.google.com/?q=Venue+Hotel+Nha+Trang+Beach', 'Khach san gan bai bien va thap Tram Huong, phu hop lich trinh check-in khu trung tam.')
) AS seed(name, location_wkt, price_level, star_rating, google_maps_url, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM hotels existing
    WHERE existing.name = seed.name
      AND existing.city = 'Nha Trang'
);
