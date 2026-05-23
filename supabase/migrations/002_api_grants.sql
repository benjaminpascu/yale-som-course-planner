-- Run this if import fails with "permission denied for table courses"
-- (usually when "Automatically expose new tables" is disabled in project settings)

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON TABLE public.courses TO anon, authenticated;
GRANT SELECT ON TABLE public.tags TO anon, authenticated;

GRANT ALL ON TABLE public.courses TO service_role;
GRANT ALL ON TABLE public.tags TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
