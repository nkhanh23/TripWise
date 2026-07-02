ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS star_rating INTEGER;

UPDATE hotels
SET star_rating = 3
WHERE star_rating IS NULL;

ALTER TABLE hotels
ALTER COLUMN star_rating SET DEFAULT 3;

ALTER TABLE hotels
ALTER COLUMN star_rating SET NOT NULL;

ALTER TABLE hotels
DROP CONSTRAINT IF EXISTS chk_hotels_star_rating;

ALTER TABLE hotels
ADD CONSTRAINT chk_hotels_star_rating
CHECK (star_rating BETWEEN 1 AND 5);
