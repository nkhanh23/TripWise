CREATE TABLE IF NOT EXISTS weather_cache (
    id BIGSERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    forecast_date DATE NOT NULL,
    temp_min INTEGER NOT NULL,
    temp_max INTEGER NOT NULL,
    rain_probability INTEGER NOT NULL,
    weather_code VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_weather_cache_city_date
    ON weather_cache (city, forecast_date);
