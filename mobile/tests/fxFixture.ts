/** Synthetic values exclusively for tests; never persisted or used in production. */
export const fxNow = Date.UTC(2026, 8, 8, 12);
export function fxFixture(now = fxNow, eur = '0.86101'): string {
  return `{"result":"success","provider":"https://www.exchangerate-api.com","documentation":"https://www.exchangerate-api.com/docs/free","terms_of_use":"https://www.exchangerate-api.com/terms","time_last_update_unix":${Math.floor(now / 1000)},"time_last_update_utc":"${new Date(now).toUTCString()}","time_next_update_unix":${Math.floor(now / 1000) + 86400},"time_next_update_utc":"${new Date(now + 86400000).toUTCString()}","time_eol_unix":0,"base_code":"USD","rates":{"USD":1,"EUR":${eur},"VND":26048,"THB":32.903,"JPY":155.81,"GBP":0.73963,"SGD":1.267,"KRW":1344.62}}`;
}
export function fxResponse(body = fxFixture(), status = 200): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => body } as Response;
}
