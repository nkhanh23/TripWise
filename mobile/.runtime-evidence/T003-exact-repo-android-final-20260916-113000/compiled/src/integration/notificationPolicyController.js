"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPolicyController = void 0;
const errors_1 = require("./errors");
const notificationPolicy_1 = require("./notificationPolicy");
/** Session-owned policy state survives Settings unmounts. No lifecycle native cleanup. */
class NotificationPolicyController {
    repository;
    permissions;
    reconciler;
    state = {
        session: null, intent: { ...notificationPolicy_1.DEFAULT_NOTIFICATION_INTENT }, permission: 'unknown', loading: true, busy: false, stale: false, error: null,
    };
    listeners = new Set();
    operation = new AbortController();
    revoked = new Set();
    pendingOff = new Set();
    pendingNativeRevocation = false;
    writes = Promise.resolve();
    settingsReturn = null;
    locale = 'en';
    constructor(repository, permissions, reconciler) {
        this.repository = repository;
        this.permissions = permissions;
        this.reconciler = reconciler;
    }
    getSnapshot = () => this.state;
    subscribe = (listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
    publish(patch) {
        this.state = { ...this.state, ...patch };
        const session = this.state.session;
        this.state.stale = !!session && session.expiresAt !== null && session.expiresAt * 1000 <= Date.now();
        this.listeners.forEach((listener) => listener());
    }
    setLocale(locale) { this.locale = locale; }
    current(session, signal) {
        return !signal.aborted && this.state.session === session
            && (session.expiresAt === null || session.expiresAt * 1000 > Date.now());
    }
    begin() { this.operation.abort(); this.operation = new AbortController(); return this.operation.signal; }
    overlay(intent) {
        return { tripReminders: intent.tripReminders && !this.revoked.has('tripReminders'),
            itineraryReminders: intent.itineraryReminders && !this.revoked.has('itineraryReminders') };
    }
    policy() {
        return (0, notificationPolicy_1.createEffectiveReminderPolicy)({ authenticated: !!this.state.session && !this.state.loading,
            stale: !!this.state.session && !this.current(this.state.session, this.operation.signal),
            intent: this.overlay(this.state.intent), permission: this.state.permission, locale: this.locale });
    }
    async bindSession(session) {
        if (session === this.state.session && !this.state.loading)
            return;
        const sameOwner = session !== null && session.user.id === this.state.session?.user.id;
        this.begin();
        this.settingsReturn = null;
        if (!sameOwner) {
            this.revoked.clear();
            this.pendingOff.clear();
            this.pendingNativeRevocation = false;
        }
        this.publish({ session, intent: { ...notificationPolicy_1.DEFAULT_NOTIFICATION_INTENT }, permission: 'unknown', loading: !!session, busy: false, error: null });
        if (session)
            await this.load();
    }
    async load() {
        const session = this.state.session;
        if (!session || this.state.busy)
            return;
        const signal = this.begin();
        this.publish({ loading: true, error: null });
        try {
            const [intent, permission] = await Promise.all([this.repository.getOwn(session, signal), this.permissions.get()]);
            if (this.current(session, signal))
                this.publish({ intent: this.overlay(intent), permission, loading: false,
                    error: this.pendingOff.size ? 'sync' : null });
        }
        catch {
            if (this.current(session, signal))
                this.publish({ intent: { ...notificationPolicy_1.DEFAULT_NOTIFICATION_INTENT }, permission: 'unknown', loading: false, error: 'load' });
        }
    }
    write(session, patch, signal) {
        // Serialize writes: an earlier enable cannot complete after a later OFF write.
        const result = this.writes.catch(() => undefined).then(() => {
            if (!this.current(session, signal))
                throw new errors_1.IntegrationError('cancelled');
            return this.repository.saveOwn(session, patch, signal);
        });
        this.writes = result;
        return result;
    }
    async setCategory(category, enabled) {
        const session = this.state.session;
        if (!session || (enabled && (this.state.loading || this.state.busy)))
            return;
        const signal = this.begin();
        this.publish({ busy: true, error: null });
        if (!enabled) {
            this.revoked.add(category);
            this.pendingOff.add(category);
            this.publish({ intent: { ...this.state.intent, [category]: false } });
            const types = [
                ...(this.revoked.has('tripReminders') ? ['TRIP_STARTING_SOON'] : []),
                ...(this.revoked.has('itineraryReminders') ? ['DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK'] : []),
            ];
            // Start native cancellation before initiating persistence; neither waits for the network.
            const cancellation = this.reconciler.reconcile(this.policy(), session, signal, types)
                .then(() => { if (this.current(session, signal))
                this.pendingNativeRevocation = false; })
                .catch(() => { if (this.current(session, signal)) {
                this.pendingNativeRevocation = true;
                this.publish({ error: 'reconcile' });
            } });
            try {
                const saved = await this.write(session, { [category]: false }, signal);
                if (this.current(session, signal)) {
                    this.pendingOff.delete(category);
                    this.publish({ intent: this.overlay(saved), error: this.pendingOff.size ? 'sync' : this.state.error });
                }
            }
            catch {
                if (this.current(session, signal))
                    this.publish({ error: 'sync' });
            }
            await cancellation;
        }
        else {
            try {
                const saved = await this.write(session, { [category]: true }, signal);
                if (!this.current(session, signal))
                    return;
                this.revoked.delete(category);
                this.pendingOff.delete(category);
                // Durable intent is visible even if the OS denies or its query fails.
                this.publish({ intent: this.overlay(saved), permission: 'unknown' });
                try {
                    let permission = await this.permissions.get();
                    if (!this.current(session, signal))
                        return;
                    if (permission === 'unknown' || permission === 'denied_requestable') {
                        permission = await this.permissions.requestFromExplicitUserAction(() => this.current(session, signal));
                    }
                    if (!this.current(session, signal))
                        return;
                    this.publish({ permission });
                }
                catch {
                    if (this.current(session, signal))
                        this.publish({ permission: 'unknown', error: 'permission' });
                    return;
                }
                try {
                    await this.reconciler.reconcile(this.policy(), session, signal);
                }
                catch {
                    if (this.current(session, signal))
                        this.publish({ error: 'reconcile' });
                }
            }
            catch {
                if (this.current(session, signal))
                    this.publish({ error: 'sync' });
            }
            finally {
                if (this.current(session, signal))
                    this.publish({ busy: false });
            }
        }
        if (this.current(session, signal))
            this.publish({ busy: false });
    }
    async retry() {
        if (this.state.busy)
            return;
        if (this.pendingOff.size || this.pendingNativeRevocation) {
            const categories = this.pendingNativeRevocation ? this.revoked : this.pendingOff;
            for (const category of [...categories])
                await this.setCategory(category, false);
        }
        else if (this.state.error === 'reconcile') {
            const session = this.state.session;
            if (!session)
                return;
            const signal = this.begin();
            this.publish({ busy: true, error: null });
            try {
                await this.reconciler.reconcile(this.policy(), session, signal);
            }
            catch {
                if (this.current(session, signal))
                    this.publish({ error: 'reconcile' });
            }
            finally {
                if (this.current(session, signal))
                    this.publish({ busy: false });
            }
        }
        else
            await this.load();
    }
    async openSystemSettings() {
        const session = this.state.session;
        if (!session || this.state.busy || this.settingsReturn)
            return;
        this.settingsReturn = { session, departed: false };
        try {
            await this.permissions.openSettings();
        }
        catch {
            if (this.settingsReturn?.session === session) {
                this.settingsReturn = null;
                this.publish({ error: 'permission' });
            }
        }
    }
    async appStateChanged(state) {
        const ticket = this.settingsReturn;
        if (!ticket)
            return;
        if (state !== 'active') {
            ticket.departed = true;
            return;
        }
        if (!ticket.departed)
            return;
        this.settingsReturn = null;
        const signal = this.begin();
        if (!this.current(ticket.session, signal))
            return;
        this.publish({ busy: true });
        try {
            const permission = await this.permissions.get();
            if (!this.current(ticket.session, signal))
                return;
            this.publish({ permission });
            await this.reconciler.reconcile(this.policy(), ticket.session, signal);
        }
        catch {
            if (this.current(ticket.session, signal))
                this.publish({ permission: 'unknown', error: 'permission' });
        }
        finally {
            if (this.current(ticket.session, signal))
                this.publish({ busy: false });
        }
    }
}
exports.NotificationPolicyController = NotificationPolicyController;
