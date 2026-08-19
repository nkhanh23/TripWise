-- V22__add_weather_fields_to_itinerary_days.sql
-- Thêm các cột thời tiết có cấu trúc vào bảng itinerary_days để tránh parse chuỗi ở frontend

ALTER TABLE itinerary_days
ADD COLUMN weather_code INTEGER,
ADD COLUMN rain_probability INTEGER,
ADD COLUMN temp_min DOUBLE PRECISION,
ADD COLUMN temp_max DOUBLE PRECISION;
