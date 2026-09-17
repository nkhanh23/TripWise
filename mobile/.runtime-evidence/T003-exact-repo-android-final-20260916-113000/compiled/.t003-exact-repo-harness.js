"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseNotificationPreferencesRepository_1 = require("./src/integration/remote/supabaseNotificationPreferencesRepository");
const url = process.env.T003_URL;
const key = process.env.T003_KEY;
const pass = 'T003-Evidence-2026';
const tag = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const map = (s) => ({ user: { id: s.user.id, email: null, displayName: null }, expiresAt: s.expires_at ?? null });
async function owner(label) { const c = (0, supabase_js_1.createClient)(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); const r = await c.auth.signUp({ email: `t003-repo-${label}-${tag}@example.com`, password: pass }); if (r.error || !r.data.session)
    throw r.error ?? new Error('missing session'); return { c, s: map(r.data.session) }; }
async function main() { const a = await owner('a'), b = await owner('b'); let ra = new supabaseNotificationPreferencesRepository_1.SupabaseNotificationPreferencesRepository(a.c, () => a.s); let initial = await ra.getOwn(a.s, new AbortController().signal); if (initial.tripReminders || initial.itineraryReminders)
    throw new Error('A defaults'); let saved = await ra.saveOwn(a.s, { tripReminders: true }, new AbortController().signal); if (!saved.tripReminders || saved.itineraryReminders)
    throw new Error('A save'); const anew = (0, supabase_js_1.createClient)(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }); const login = await anew.auth.signInWithPassword({ email: `t003-repo-a-${tag}@example.com`, password: pass }); if (login.error || !login.data.session)
    throw login.error ?? new Error('relogin'); const as = map(login.data.session); ra = new supabaseNotificationPreferencesRepository_1.SupabaseNotificationPreferencesRepository(anew, () => as); let reload = await ra.getOwn(as, new AbortController().signal); if (!reload.tripReminders || reload.itineraryReminders)
    throw new Error('reload'); let partial = await ra.saveOwn(as, { itineraryReminders: true }, new AbortController().signal); if (!partial.tripReminders || !partial.itineraryReminders)
    throw new Error('partial'); const rb = new supabaseNotificationPreferencesRepository_1.SupabaseNotificationPreferencesRepository(b.c, () => b.s); const bi = await rb.getOwn(b.s, new AbortController().signal); if (bi.tripReminders || bi.itineraryReminders)
    throw new Error('B leak'); console.log('EXACT_PRODUCTION_REPOSITORY_DURABLE_RELOAD_PASS'); }
main().catch(e => { console.error('HARNESS_FAIL', e?.name, e?.message); process.exitCode = 1; });
