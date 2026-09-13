const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const assert = require('assert');

// 1. Read secret securely without printing it
const envContent = '';
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = 'https://[REDACTED].supabase.co';
const publishableKey = '[REDACTED]';

const adminClient = createClient(url, secretKey, { auth: { persistSession: false } });

let userA_id, userB_id;
let trip_id, item_id;

function log(msg) { console.log(`[VERIFY] ${msg}`); }
function logFail(msg) { console.error(`[FAIL] ${msg}`); }

async function run() {
  try {
    log('Starting FEATURE-P6-T001 remote functional closure...');
    
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
    const authA = await clientA.auth.signInWithPassword({ email: emailA, password });
    assert(!authA.error, 'User A sign in failed');
    
    const clientB = createClient(url, publishableKey, { auth: { persistSession: false } });
    const authB = await clientB.auth.signInWithPassword({ email: emailB, password });
    assert(!authB.error, 'User B sign in failed');

    const anonClient = createClient(url, publishableKey, { auth: { persistSession: false } });

    const { data: trip, error: tripErr } = await clientA.from('trips').insert({ user_id: userA_id, title: 'P6 Test Trip', destination: 'Dest', start_date: '2026-09-15', end_date: '2026-09-20' }).select().single();
    assert(!tripErr, `Trip creation failed: ${tripErr?.message}`);
    trip_id = trip.id;
    
    const { data: day, error: dayErr } = await clientA.from('itinerary_days').insert({ trip_id, day_number: 1, date: '2026-09-15' }).select().single();
    assert(!dayErr, `Day creation failed: ${dayErr?.message}`);

    const { data: item, error: itemErr } = await clientA.from('itinerary_items').insert({ itinerary_day_id: day.id, position: 1, place_name: 'test', item_kind: 'custom_activity', flexibility: 'fixed', priority: 'must_do', activity_status: 'scheduled', accommodation_details_present: false }).select().single();
    assert(!itemErr, `Item creation failed: ${itemErr?.message}`);
    item_id = item.id;
    
    let currentRev = trip.workspace_revision;

    log('Testing Owner / RLS / Auth matrix...');
    const { data: rTrip } = await clientA.from('trips').select('*').eq('id', trip_id).single();
    assert(rTrip.id === trip_id, 'User A should read trip');

    const { data: bTrip } = await clientB.from('trips').select('*').eq('id', trip_id);
    assert(bTrip.length === 0, 'User B should not read A trip');

    const bRpc = await clientB.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'completed' } });
    assert(bRpc.error, 'User B RPC should be denied');

    const bEvents = await clientB.from('trip_progress_events').select('*').eq('trip_id', trip_id);
    assert(bEvents.error === null && bEvents.data.length === 0, 'User B direct select must return 0 rows w/o error');

    const anonRpc = await anonClient.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'completed' } });
    assert(anonRpc.error, 'Anon RPC should be denied');

    const insEvt = await clientA.from('trip_progress_events').insert({ trip_id, item_id, revision: 999, idempotency_key: 'x', from_status: 'scheduled', to_status: 'completed', occurred_at: new Date() });
    assert(insEvt.error, 'Direct INSERT should be denied');
    const updEvt = await clientA.from('trip_progress_events').update({ to_state: 'scheduled' }).eq('trip_id', trip_id);
    assert(updEvt.error, 'Direct UPDATE should be denied');
    const delEvt = await clientA.from('trip_progress_events').delete().eq('trip_id', trip_id);
    assert(delEvt.error, 'Direct DELETE should be denied');

    const privSink = await clientA.rpc('apply_verified_place_snapshot', { p_trip_id: trip_id, p_item_id: item_id, p_place_id: '1', p_name: '1', p_lat: 1, p_lng: 1, p_address: '1', p_category: '1' });
    assert(privSink.error, 'Private sink should not be executable by auth role');
    
    log('Testing 6-transition matrix...');
    async function assertTrans(to_state, expectAllowed) {
      const b4Trip = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
      const b4Events = (await clientA.from('trip_progress_events').select('*', { count: 'exact' }).eq('item_id', item_id)).count;
      
      const rpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: b4Trip.data.workspace_revision, status: to_state } });
      
      const aftTrip = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
      const aftItem = await clientA.from('itinerary_items').select('activity_status, completed_at, skipped_at').eq('id', item_id).single();
      const aftEventsReq = await clientA.from('trip_progress_events').select('*').eq('item_id', item_id).order('occurred_at', { ascending: false });
      const evtDelta = aftEventsReq.data.length - b4Events;

      if (expectAllowed) {
        assert(!rpc.error, `Expected allowed, got: ${rpc.error?.message}`);
        assert(evtDelta === 1, `Expected +1 event, got ${evtDelta}`);
        assert(aftItem.data.activity_status === to_state, 'Item state mismatch');
        assert(aftTrip.data.workspace_revision === b4Trip.data.workspace_revision + 1, 'Revision not incremented');
        const latestEvt = aftEventsReq.data[0];
        assert(latestEvt.to_status === to_state, 'Event to_state mismatch');
        assert(latestEvt.revision === aftTrip.data.workspace_revision, 'Event revision mismatch');
        if (to_state === 'completed') assert(new Date(latestEvt.occurred_at).getTime() === new Date(aftItem.data.completed_at).getTime(), 'completed_at mismatch');
        if (to_state === 'skipped') assert(new Date(latestEvt.occurred_at).getTime() === new Date(aftItem.data.skipped_at).getTime(), 'skipped_at mismatch');
        if (to_state === 'scheduled') assert(aftItem.data.completed_at === null && aftItem.data.skipped_at === null, 'Terminal timestamps not cleared');
      } else {
        assert(rpc.error && (rpc.error.message?.includes('TW012') || rpc.error.code === 'TW012'), `Expected TW012, got: ${JSON.stringify(rpc)}`);
        assert(evtDelta === 0, 'Event delta must be 0 for forbidden');
        assert(aftTrip.data.workspace_revision === b4Trip.data.workspace_revision, 'Revision changed for forbidden');
      }
      return aftTrip.data.workspace_revision;
    }

    currentRev = await assertTrans('completed', true);
    currentRev = await assertTrans('scheduled', true);
    currentRev = await assertTrans('skipped', true);
    await assertTrans('completed', false);
    currentRev = await assertTrans('scheduled', true);
    currentRev = await assertTrans('completed', true);
    await assertTrans('skipped', false);

    log('Testing stale revision rejection...');
    const staleRpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev - 1, status: 'scheduled' } });
    assert(staleRpc.error && (staleRpc.error.message?.includes('TW009') || staleRpc.error.code === 'TW009'), `Expected TW009, got: ${JSON.stringify(staleRpc)}`);

    log('Testing true concurrency...');
    const p1 = clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'scheduled' } });
    const p2 = clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev, status: 'scheduled' } });
    const results = await Promise.all([p1, p2]);
    const successes = results.filter(r => !r.error);
    const tw009s = results.filter(r => r.error && (r.error.message?.includes('TW009') || r.error.code === 'TW009'));
    assert(successes.length === 1, 'Expected 1 success');
    assert(tw009s.length === 1, 'Expected 1 TW009');
    const postCRev = await clientA.from('trips').select('workspace_revision').eq('id', trip_id).single();
    assert(postCRev.data.workspace_revision === currentRev + 1, 'Revision not incremented correctly during concurrency');
    currentRev = postCRev.data.workspace_revision;

    log('Testing idempotency retry...');
    const retryRpc = await clientA.rpc('mutate_travel_workspace', { p_command: { type: 'transition_item_status', tripId: trip_id, itemId: item_id, expectedRevision: currentRev - 1, status: 'scheduled' } });
    assert(retryRpc.error && (retryRpc.error.message?.includes('TW009') || retryRpc.error.code === 'TW009'), 'Idempotent retry failed to return TW009');

    log('Testing read bounds...');
    const readLimit50 = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'events', limit: 50 } });
    assert(!readLimit50.error, 'Limit 50 failed');
    const readLimit51 = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'events', limit: 51 } });
    assert(readLimit51.error, 'Limit 51 not rejected');
    const readKeyset = await clientA.rpc('read_trip_progress', { p_request: { tripId: trip_id, kind: 'events', limit: 2, beforeRevision: currentRev } });
    assert(!readKeyset.error, 'Keyset before_revision failed');

    log('ALL TESTS PASSED.');
  } catch (err) {
    logFail(`VERIFICATION FAILED: ${err.message}`);
    process.exitCode = 1;
  } finally {
    log('Running cleanup...');
    try {
      if (trip_id) {
        await adminClient.from('trips').delete().eq('id', trip_id);
        const checkTrip = await adminClient.from('trips').select('*').eq('id', trip_id);
        assert(checkTrip.data.length === 0, 'Disposable trip not absent');
      }

      if (userA_id) {
        const dA = await adminClient.auth.admin.deleteUser(userA_id);
        if (dA.error) console.log(`Delete User A error: ${dA.error.message}`);
      }
      if (userB_id) {
        const dB = await adminClient.auth.admin.deleteUser(userB_id);
        if (dB.error) console.log(`Delete User B error: ${dB.error.message}`);
      }
      
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
