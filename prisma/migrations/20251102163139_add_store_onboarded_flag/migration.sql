DROP INDEX IF EXISTS "public"."customers_email_key";

-- Note: The onboarded column addition to stores table will be handled
-- in migration 20251102181442_add_store_model when the stores table is created.
-- Note: Constraint and index renames for user_settings -> settings will be handled
-- in migration 20251102182143_rename_user_settings_to_settings
