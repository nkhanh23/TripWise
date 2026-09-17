"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseTripRepositories_1 = require("../../src/integration/remote/supabaseTripRepositories");
const reminderEngine_1 = require("../../src/integration/reminderEngine");
const node_fs_1 = require("node:fs");
function readEnv(name) {
    const files = ['.env.local', '.env'];
    for (const file of files) {
        const line = (0, node_fs_1.readFileSync)(file, 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
        if (line)
            return line.slice(name.length + 1).trim();
    }
    throw new Error(`Missing ${name}`);
}
function localDate(timezone, offsetDays) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + offsetDays));
    return date.toISOString().slice(0, 10);
}
async function main() {
    // The Android production client reaches the local DEV gateway through 10.0.2.2;
    // this evidence harness runs on the host and reaches the same gateway loopback.
    const url = readEnv('EXPO_PUBLIC_SUPABASE_URL').replace('10.0.2.2', '127.0.0.1');
    const key = readEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    const credentialsSource = (0, node_fs_1.readFileSync)('../setup_valid_db.js', 'utf8');
    const password = /crypt\('([^']+)'/.exec(credentialsSource)?.[1];
    const email = /email\s*=\s*'([^']+)'/.exec(credentialsSource)?.[1];
    if (!email || !password)
        throw new Error('Existing local DEV evidence credential unavailable');
    const client = (0, supabase_js_1.createClient)(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
    if (authError || !auth.session || !auth.user)
        throw new Error('Real local Supabase authentication failed');
    const timezone = 'Asia/Bangkok';
    const startDate = localDate(timezone, 1);
    const endDate = startDate;
    const command = {
        idempotencyKey: `t003-evidence-${Date.now()}`,
        graph: {
            title: 'Disposable T003 evidence trip', destination: 'User-authored evidence destination', startDate, endDate,
            days: [{ dayNumber: 1, date: startDate, items: [{ position: 1, placeName: 'User-authored reminder anchor' }] }],
        },
    };
    const persistence = new supabaseTripRepositories_1.SupabaseTripPersistenceRepository(client);
    const id = await persistence.persist(command);
    const saved = new supabaseTripRepositories_1.SupabaseSavedTripsRepository(client);
    const beforeTimezone = await saved.getDetail(id);
    if (!beforeTimezone)
        throw new Error('Created owner trip was not readable');
    const { data: timezoneData, error: timezoneError } = await client.rpc('set_trip_timezone', {
        p_command: { tripId: id, expectedRevision: beforeTimezone.workspaceRevision, timezone },
    });
    if (timezoneError || !timezoneData)
        throw new Error('Owner timezone mutation failed');
    const detail = await saved.getDetail(id);
    if (!detail || detail.timezone?.timezone !== timezone)
        throw new Error('Parser-valid timezone readback failed');
    const candidates = (0, reminderEngine_1.generateReminderCandidates)({ ownerId: auth.user.id, trips: [detail], now: Date.now() });
    process.stdout.write(JSON.stringify({
        ownerId: auth.user.id, tripId: id, creationPath: 'SupabaseTripPersistenceRepository.persist -> public.create_trip_graph',
        timezoneMutationPath: 'public.set_trip_timezone owner-scoped RPC', startDate, endDate,
        workspaceRevision: detail.workspaceRevision, timezone: detail.timezone, days: detail.days,
        candidateTypes: candidates.map((candidate) => candidate.type), candidates,
    }));
}
void main();
