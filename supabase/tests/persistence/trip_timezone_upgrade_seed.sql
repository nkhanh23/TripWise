create table tripwise_private.test_timezone_upgrade_baseline as select id,to_jsonb(t) as snapshot from public.trips t;
