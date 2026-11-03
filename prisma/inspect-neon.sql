-- READ ONLY: execute in Neon SQL Editor. No schema or data modifications.
SELECT migration_name, checksum, started_at, finished_at, rolled_back_at
FROM public."_prisma_migrations"
ORDER BY started_at;

SELECT tablename FROM pg_catalog.pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT 'Category' AS table_name, COUNT(*) AS row_count FROM public."Category"
UNION ALL SELECT 'Listing', COUNT(*) FROM public."Listing"
UNION ALL SELECT 'Conversation', COUNT(*) FROM public."Conversation"
UNION ALL SELECT 'Message', COUNT(*) FROM public."Message"
UNION ALL SELECT 'VehicleMake', COUNT(*) FROM public."VehicleMake"
UNION ALL SELECT 'VehicleModel', COUNT(*) FROM public."VehicleModel"
UNION ALL SELECT 'email_otp_challenge', COUNT(*) FROM public."email_otp_challenge"
UNION ALL SELECT 'partner_application', COUNT(*) FROM public."partner_application"
UNION ALL SELECT 'partner_profile', COUNT(*) FROM public."partner_profile";
