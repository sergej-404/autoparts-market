-- READ ONLY diagnostic for the Neon SQL Editor.
-- This script does not create, update, or delete database objects or rows.

-- 1. Migration history: successful, rolled back, and unfinished records.
SELECT
  migration_name,
  checksum,
  started_at,
  finished_at,
  rolled_back_at,
  CASE
    WHEN rolled_back_at IS NOT NULL THEN 'ROLLED_BACK'
    WHEN finished_at IS NOT NULL THEN 'APPLIED'
    ELSE 'INCOMPLETE'
  END AS migration_state
FROM public."_prisma_migrations"
ORDER BY started_at, migration_name;

-- 2. Check whether the five migration records documented as missing locally
--    are present in the live database migration history.
WITH expected(migration_name) AS (
  VALUES
    ('20261014000000_email_otp'),
    ('20261019000000_add_admin_system_data'),
    ('20261019010000_remove_seeded_demo_data'),
    ('20261019020000_add_user_public_id'),
    ('20261029150000_partner_program')
)
SELECT
  expected.migration_name,
  migration.migration_name IS NOT NULL AS record_exists,
  migration.checksum,
  migration.started_at,
  migration.finished_at,
  migration.rolled_back_at
FROM expected
LEFT JOIN public."_prisma_migrations" AS migration
  ON migration.migration_name = expected.migration_name
ORDER BY expected.migration_name;

-- 3. Existing public tables. reltuples is an estimate, not an exact row count.
SELECT
  schemaname,
  tablename,
  n_live_tup AS estimated_live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Exact row counts for legacy tables when they exist. Missing tables are
--    reported as notices instead of aborting the whole diagnostic script.
DO $$
DECLARE
  table_name text;
  row_count bigint;
  legacy_tables text[] := ARRAY[
    'Category',
    'Listing',
    'Conversation',
    'Message',
    'VehicleMake',
    'VehicleModel',
    'email_otp_challenge',
    'partner_application',
    'partner_profile',
    'listing',
    'product_category',
    'car_make',
    'car_model'
  ];
BEGIN
  FOREACH table_name IN ARRAY legacy_tables LOOP
    IF to_regclass(format('%I.%I', 'public', table_name)) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %I.%I', 'public', table_name)
        INTO row_count;
      RAISE NOTICE 'TABLE %.% exact_rows=%', 'public', table_name, row_count;
    ELSE
      RAISE NOTICE 'TABLE %.% does_not_exist', 'public', table_name;
    END IF;
  END LOOP;
END $$;
