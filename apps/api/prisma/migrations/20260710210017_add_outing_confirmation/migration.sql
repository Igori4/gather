ALTER TABLE "outings" ADD COLUMN IF NOT EXISTS "confirmed_place_id" TEXT;
ALTER TABLE "outings" ADD COLUMN IF NOT EXISTS "confirmed_slot_id" TEXT;
