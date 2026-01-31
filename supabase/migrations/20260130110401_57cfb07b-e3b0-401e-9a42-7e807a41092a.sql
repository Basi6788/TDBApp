-- Drop the unique constraint on device_id to allow multiple accounts per device
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_device_id_key;

-- Also drop the unique index if it exists separately
DROP INDEX IF EXISTS users_device_id_key;