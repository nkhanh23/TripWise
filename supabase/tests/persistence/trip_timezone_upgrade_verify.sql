do $$ begin
  if exists(select 1 from tripwise_private.test_timezone_upgrade_baseline b left join public.trips t on t.id=b.id
    where t.id is null or to_jsonb(t)-'schedule_timezone'-'timezone_provenance'-'timezone_confirmed_at' <> b.snapshot
      or num_nonnulls(t.schedule_timezone,t.timezone_provenance,t.timezone_confirmed_at)<>0) then
    raise exception 'Timezone upgrade changed a legacy row';
  end if;
end $$;
drop table tripwise_private.test_timezone_upgrade_baseline;
select 'TRIP_TIMEZONE_UPGRADE_LEGACY_NULL_PASS' as result;
