const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const assert = require('assert');
const { execSync } = require('child_process');

const envContent = '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = 'https://[REDACTED].supabase.co';
const publishableKey = '[REDACTED]';

const adminClient = createClient(url, secretKey, { auth: { persistSession: false } });

let userA_id, userB_id, trip_id, day_id, item_id;

function log(msg) { console.log(`[VERIFY] ${msg}`); }
function logFail(msg) { console.error(`[FAIL] ${msg}`); }

async function run() {
  try {
    log('Starting FEATURE-P6-T001 remote functional closure CORRECTIVE...');
    
    log('Creating disposable users...');
    const emailA = `testA_${Date.now()}@example.com`;
    const emailB = `testB_${Date.now()}@example.com`;
    const password = 'TestPassword123!';
    
    const resA = await adminClient.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    assert(!resA.error, 'User A creation failed');
    userA_id = resA.data.user.id;
    
    const resB = await adminClient.auth.admin.createUser({ email: emailB, password, email_confirm: true });
    assert(!resB.error, 'User B creation failed');
    userB_id = resB.data.user.id;
    
    const clientA = createClient(url, publishableKey, { auth: { persistSession: false } });
    await clientA.auth.signInWithPassword({ email: emailA, password });
    
    const clientB = createClient(url, publishableKey, { auth: { persistSession: false } });
    await clientB.auth.signInWithPassword({ email: emailB, password });

    const anonClient = createClient(url, publishableKey, { auth: { persistSession: false } });

    const { data: trip } = await clientA.from('trips').insert({ user_id: userA_id, title: 'P6 Test Trip', destination: 'Dest', start_date: '2026-09-15', end_date: '2026-09-20' }).select().single();
    trip_id = trip.id;
    
    const { data: day } = await clientA.from('itinerary_days').insert({ trip_id, day_number: 1, date: '2026-09-15' }).select().single();
    day_id = day.id;

    const { data: item } = await clientA.from('itinerary_items').insert({ itinerary_day_id: day.id, position: 1, place_name: 'test', item_kind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activity_status: 'scheduled', accommodation_details_present: false }).select().single();
    item_id = item.id;
    let currentRev = trip.workspace_revision;

    log('Testing Owner / RLS / Auth matrix...');
    const { data: rTrip } = await clientA.from('trips').select('*').eq('id', trip_id).single();
    assert(rTrip.id === trip_id, 'User A read trip succeeds');

    const bTrip = await clientB.from('trips').select('*').eq('id', trip_id);
    assert(bTrip.data.length === 0, 'User B read trip returns expected 0 rows');

    const bRpc = await clientB.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'completed' } });
    assert(bRpc.error, 'User B RPC should be denied');

    const readStateA = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'state' } });
    assert(!readStateA.error, 'read_trip_progress state A succeeds');

    const readStateB = await clientB.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'state' } });
    assert(readStateB.error && readStateB.error.code === 'TW008', 'read_trip_progress state B returns owner/not-found');

    const anonState = await anonClient.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'state' } });
    assert(anonState.error && (anonState.error.code === 'TW006' || anonState.error.code === '42501'), `read_trip_progress anon returns auth required, got: ${JSON.stringify(anonState)}`);

    const bEvents = await clientB.from('trip_progress_events').select('*').eq('trip_id', trip_id);
    assert(bEvents.error === null && bEvents.data.length === 0, 'User B direct select must return 0 rows w/o error');

    log('Testing Direct Event DML Denials...');
    const insEvt = await clientA.from('trip_progress_events').insert({ trip_id, item_id, revision: 999, idempotency_key: `${item_id}:999`, from_status: 'scheduled', to_status: 'completed', occurred_at: new Date().toISOString() });
    assert(insEvt.error && insEvt.error.code === '42501', `Direct INSERT should be denied by RLS: ${insEvt.error?.message}`);
    const updEvt = await clientA.from('trip_progress_events').update({ to_status: 'scheduled' }).eq('trip_id', trip_id);
    assert(updEvt.error && updEvt.error.code === '42501', 'Direct UPDATE should be denied by RLS');
    const delEvt = await clientA.from('trip_progress_events').delete().eq('trip_id', trip_id);
    assert(delEvt.error && delEvt.error.code === '42501', 'Direct DELETE should be denied by RLS');

    log('Testing Private P6 Sink Introspection...');
    const psqlCheck = execSync('npx supabase db query --linked "SELECT has_function_privilege(\'authenticated\', \'tripwise_private.record_trip_progress(uuid,uuid,integer,text,text,timestamptz)\', \'EXECUTE\') as auth_exec, has_function_privilege(\'anon\', \'tripwise_private.record_trip_progress(uuid,uuid,integer,text,text,timestamptz)\', \'EXECUTE\') as anon_exec" --output-format json').toString();
    const jsonStr = psqlCheck.substring(psqlCheck.indexOf('{'));
    const privs = JSON.parse(jsonStr).rows[0];
    assert(privs.auth_exec === false, 'authenticated MUST NOT have EXECUTE on private sink');
    assert(privs.anon_exec === false, 'anon MUST NOT have EXECUTE on private sink');

    log('Testing 4 allowed transitions...');
    async function assertTrans(from_state, to_state) {
      const b4Trip = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
      const b4EventsReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
      const b4Events = b4EventsReq.count;
      
      const rpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: b4Trip.data.workspace_revision, status: to_state } });
      
      const aftTrip = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
      const aftItem = await clientA.from('itinerary_items').select('activity_status, completed_at, skipped_at').eq('id', item_id).single();
      const aftEventsReq = await clientA.from('trip_progress_events').select('*').eq('item_id', item_id).order('occurred_at', { ascending: false });
      const evtDelta = aftEventsReq.data.length - b4Events;

      assert(!rpc.error, `Expected allowed, got: ${rpc.error?.message}`);
      assert(evtDelta === 1, `Expected +1 event, got ${evtDelta}`);
      assert(aftItem.data.activity_status === to_state, 'Item state mismatch');
      assert(aftTrip.data.workspace_revision === b4Trip.data.workspace_revision + 1, 'Revision not incremented');
      const latestEvt = aftEventsReq.data[0];
      assert(latestEvt.trip_id === trip_id, 'Exact trip_id mismatch');
      assert(latestEvt.item_id === item_id, 'Exact item_id mismatch');
      assert(latestEvt.from_status === from_state, 'from_status mismatch');
      assert(latestEvt.to_status === to_state, 'to_status mismatch');
      assert(latestEvt.revision === aftTrip.data.workspace_revision, 'Event revision mismatch');
      assert(latestEvt.idempotency_key === `${item_id}:${latestEvt.revision}`, 'idempotency_key format mismatch');
      
      if (to_state === 'completed') {
        assert(new Date(latestEvt.occurred_at).getTime() === new Date(aftItem.data.completed_at).getTime(), 'completed_at mismatch');
        assert(aftItem.data.skipped_at === null, 'skipped_at must be null');
      }
      if (to_state === 'skipped') {
        assert(new Date(latestEvt.occurred_at).getTime() === new Date(aftItem.data.skipped_at).getTime(), 'skipped_at mismatch');
        assert(aftItem.data.completed_at === null, 'completed_at must be null');
      }
      if (to_state === 'scheduled') {
        assert(aftItem.data.completed_at === null && aftItem.data.skipped_at === null, 'Terminal timestamps not cleared');
      }
      return aftTrip.data.workspace_revision;
    }

    currentRev = await assertTrans('scheduled', 'completed');
    currentRev = await assertTrans('completed', 'scheduled');
    currentRev = await assertTrans('scheduled', 'skipped');
    currentRev = await assertTrans('skipped', 'scheduled');

    log('Testing forbidden transitions...');
    async function assertForbidden(to_state) {
      const b4Trip = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
      const b4EventsReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
      const b4Events = b4EventsReq.count;
      
      const rpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: b4Trip.data.workspace_revision, status: to_state } });
      
      const aftTrip = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
      const aftEventsReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
      const evtDelta = aftEventsReq.count - b4Events;

      assert(rpc.error && (rpc.error.message?.includes('TW012') || rpc.error.code === 'TW012'), `Expected TW012, got: ${JSON.stringify(rpc)}`);
      assert(evtDelta === 0, 'Event delta must be 0 for forbidden');
      assert(aftTrip.data.workspace_revision === b4Trip.data.workspace_revision, 'Revision changed for forbidden');
    }
    
    currentRev = await assertTrans('scheduled', 'completed'); // setup
    await assertForbidden('skipped');
    currentRev = await assertTrans('completed', 'scheduled'); // setup
    currentRev = await assertTrans('scheduled', 'skipped'); // setup
    await assertForbidden('completed');
    currentRev = await assertTrans('skipped', 'scheduled'); // reset back to scheduled

    log('Testing Stale Atomicity...');
    const b4TripStale = await clientA.from('trips').select('*').eq('id', trip_id).single();
    const b4ItemStale = await clientA.from('itinerary_items').select('*').eq('id', item_id).single();
    const b4EvtsStaleReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
    const b4EvtsStale = b4EvtsStaleReq.count;

    const staleRpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev - 1, status: 'completed' } });
    assert(staleRpc.error && (staleRpc.error.message?.includes('TW009') || staleRpc.error.code === 'TW009'), 'Expected TW009 for stale request');
    
    const aftTripStale = await clientA.from('trips').select('*').eq('id', trip_id).single();
    const aftItemStale = await clientA.from('itinerary_items').select('*').eq('id', item_id).single();
    const aftEvtsStaleReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
    const aftEvtsStale = aftEvtsStaleReq.count;
    
    assert(aftTripStale.data.workspace_revision === b4TripStale.data.workspace_revision, 'Revision changed on stale');
    assert(aftItemStale.data.activity_status === b4ItemStale.data.activity_status, 'Lifecycle changed on stale');
    assert(aftItemStale.data.skipped_at === b4ItemStale.data.skipped_at, 'skipped_at changed on stale');
    assert(aftEvtsStale === b4EvtsStale, 'Event count changed on stale');

    log('Testing True Concurrency...');
    const b4ConEvtsReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
    const b4ConEvts = b4ConEvtsReq.count;
    const p1 = clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'completed' } });
    const p2 = clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'completed' } });
    const results = await Promise.all([p1, p2]);
    const successes = results.filter(r => !r.error);
    const tw009s = results.filter(r => r.error && (r.error.message?.includes('TW009') || r.error.code === 'TW009'));
    
    assert(successes.length === 1, 'Expected exactly 1 success');
    assert(tw009s.length === 1, 'Expected exactly 1 TW009');
    
    const postCRevReq = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
    assert(postCRevReq.data.workspace_revision === currentRev + 1, 'Revision delta must be exactly +1');
    const aftConEvtsReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
    const aftConEvts = aftConEvtsReq.count;
    assert(aftConEvts - b4ConEvts === 1, 'Event count delta exactly +1');
    currentRev = postCRevReq.data.workspace_revision;

    log('Testing Stale Retry after Race...');
    const retryRpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev - 1, status: 'completed' } });
    assert(retryRpc.error && (retryRpc.error.message?.includes('TW009') || retryRpc.error.code === 'TW009'), 'Retry failed to return TW009');
    const retryEvtCntReq = await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id);
    assert(retryEvtCntReq.count === aftConEvts, 'Zero event delta for retry');

    log('Testing Read Bounds / Keyset...');
    const readLimit50 = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'events', limit: 50 } });
    assert(!readLimit50.error, 'Limit 50 failed');
    const readLimit51 = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'events', limit: 51 } });
    assert(readLimit51.error && readLimit51.error.code === 'TW022', 'Limit 51 must return exact TW022');
    const readKeyset = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'events', limit: 2, beforeRevision: currentRev } });
    assert(!readKeyset.error, 'Keyset beforeRevision failed');
    const ksEvents = Array.isArray(readKeyset.data) ? readKeyset.data : readKeyset.data?.events;
    assert(ksEvents.length <= 3, `Keyset respects bounded size, got: ${ksEvents.length}`);
    for (const evt of ksEvents) {
      assert(evt.revision < currentRev, 'Returned event revision is strictly less than beforeRevision');
    }

    log('ALL TESTS PASSED.');
  } catch (err) {
    logFail(`VERIFICATION FAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    log('Running cleanup...');
    try {
      if (trip_id) {
        await adminClient.from('trips').delete().eq('id', trip_id);
      }
      if (userA_id) {
        await adminClient.auth.admin.deleteUser(userA_id);
      }
      if (userB_id) {
        await adminClient.auth.admin.deleteUser(userB_id);
      }
      
      const vTrip = await adminClient.from('trips').select('*').eq('id', trip_id);
      assert(vTrip.data.length === 0, 'Trip not deleted');
      const vDay = await adminClient.from('itinerary_days').select('*').eq('id', day_id);
      assert(vDay.data.length === 0, 'Day not deleted');
      const vItem = await adminClient.from('itinerary_items').select('*').eq('id', item_id);
      assert(vItem.data.length === 0, 'Item not deleted');
      const vEvt = await adminClient.from('trip_progress_events').select('*').eq('trip_id', trip_id);
      assert(vEvt.data.length === 0, 'Events not deleted');
      
      const verifyA = await adminClient.auth.admin.getUserById(userA_id);
      const verifyB = await adminClient.auth.admin.getUserById(userB_id);
      assert(verifyA.error != null, 'User A not deleted');
      assert(verifyB.error != null, 'User B not deleted');
      
      log('CLEANUP VERIFIED.');
    } catch (cleanupErr) {
      logFail(`CLEANUP FAILED: ${cleanupErr.message}`);
      process.exitCode = 1;
    }
  }
}

run();
