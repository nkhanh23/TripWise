import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import type { AuthenticatedSession, SavedTripDetail, UserId } from '../src/integration/contracts';
import { SupabaseTripTimezoneRepository } from '../src/integration/remote/supabaseTripTimezoneRepository';
import { isSupportedTripTimezone, parseTripTimezone, validateSetTripTimezoneCommand } from '../src/integration/tripTimezone';
import { parseSavedTripDetail, validatePersistTripCommand } from '../src/integration/validation';
import { parseTripProgressState, projectTripProgress } from '../src/integration/tripProgress';

const tripId = '77000000-0000-4000-8000-000000000001';
const confirmed = { timezone: 'Asia/Ho_Chi_Minh', provenance: 'USER_CONFIRMED', confirmedAt: '2026-09-13T12:00:00+00:00' } as const;
const empty = { timezone: null, provenance: null, confirmedAt: null };
const command = { tripId, expectedRevision: 2, timezone: confirmed.timezone };
const detail = { id: tripId, title: 'Trip', destination: 'Free text', startDate: '2028-03-12', endDate: '2028-03-12',
  createdAt: '2026-09-13T12:00:00Z', updatedAt: '2026-09-13T12:00:00Z', workspaceRevision: 2,
  days: [{ id:'77000000-0000-4000-8000-000000000011', dayNumber:1, date:'2028-03-12', items:[] }] };

describe('explicit trip timezone validation', () => {
  test.each(['Asia/Ho_Chi_Minh','America/New_York','Europe/Paris','America/Argentina/Buenos_Aires'])('supported %s', timezone => {
    expect(isSupportedTripTimezone(timezone)).toBe(true);
    expect(parseTripTimezone({...confirmed,timezone}).timezone).toBe(timezone);
  });
  test.each(['',' ','PST','EST','UTC','GMT','+07:00','UTC+7','Etc/GMT-7','EST5EDT','posix/Asia/Tokyo',
    'Asia/Unknown','asia/tokyo','Asia/Tokyo ','Asia/Tokyo\n','A'.repeat(2000)])('reject %s', timezone => {
    expect(isSupportedTripTimezone(timezone)).toBe(false);
    expect(() => parseTripTimezone({...confirmed,timezone})).toThrow();
    expect(() => validateSetTripTimezoneCommand({...command,timezone})).toThrow();
  });
  test.each([undefined,null,empty])('legacy/null %j', value => expect(parseTripTimezone(value)).toEqual(empty));
  test.each([{}, {timezone:null}, {...confirmed,provenance:'GOOGLE'}, {...confirmed,provenance:null},
    {...confirmed,confirmedAt:null}, {...confirmed,timezone:null}, {...confirmed,confirmedAt:'2028-02-30T00:00:00Z'},
    {...confirmed,confirmedAt:'2028-01-01T00:00:00'}, {...confirmed,confirmedAt:'infinity'},
    {...confirmed,confirmedAt:'2028-01-01T00:00:00+14:30'}, {...confirmed,extra:'field'}])('reject tuple %j', value => {
    expect(() => parseTripTimezone(value)).toThrow();
  });
  test('unsupported runtime rejects rather than guessing', () => {
    const spy=jest.spyOn(Intl,'DateTimeFormat').mockImplementation(() => { throw new RangeError(); });
    try { expect(() => parseTripTimezone(confirmed)).toThrow(); } finally { spy.mockRestore(); }
  });
  test('independent of implicit clock and device timezone', () => {
    const spy=jest.spyOn(Date,'now').mockImplementation(() => { throw new Error('Implicit clock'); });
    try { expect(parseTripTimezone(confirmed)).toEqual(confirmed); } finally { spy.mockRestore(); }
  });
  test('saved detail validates tuple, preserves legacy', () => {
    expect(parseSavedTripDetail(detail)?.id).toBe(tripId);
    expect(parseSavedTripDetail({...detail,timezone:empty})?.timezone).toEqual(empty);
    expect(parseSavedTripDetail({...detail,timezone:confirmed})?.timezone).toEqual(confirmed);
    expect(() => parseSavedTripDetail({...detail,timezone:{...confirmed,provenance:'GEMINI'}})).toThrow();
  });
  test('progress consumes only confirmed calendar fact; lifecycle remains unchanged', () => {
    const base=projectTripProgress(detail as unknown as SavedTripDetail);
    const result=projectTripProgress({...detail,timezone:confirmed} as unknown as SavedTripDetail);
    expect(base.calendar).toBe('unavailable_timezone');
    expect(result).toEqual({...base,calendar:'available_user_confirmed',timezone:confirmed});
    expect(parseTripProgressState({tripId,revision:2,days:[],timezone:confirmed}).calendar).toBe('available_user_confirmed');
    expect(() => parseTripProgressState({tripId,revision:2,days:[],timezone:{...confirmed,provenance:'WEATHER'}})).toThrow();
    expect(result).not.toHaveProperty('arrived');
  });
  test('create graph cannot accept hidden AI/provider timezone confirmation', () => {
    const base = { idempotencyKey: 'timezone-forgery', graph: {
      title: 'Trip', destination: 'Country', startDate: '2028-01-01', endDate: '2028-01-01',
      days: [{ dayNumber: 1, date: '2028-01-01', items: [{ position: 1, placeName: 'Unresolved place' }] }],
    } };
    expect(() => validatePersistTripCommand(base)).not.toThrow();
    expect(() => validatePersistTripCommand({ ...base, graph: { ...base.graph, timezone: confirmed } })).toThrow();
  });
});

describe('timezone repository session/CAS boundary', () => {
  let session: AuthenticatedSession | null;
  let rpc: jest.Mock;
  let repo: SupabaseTripTimezoneRepository;
  beforeEach(() => {
    session={user:{id:tripId as UserId,email:null,displayName:null},expiresAt:null};
    rpc=jest.fn(() => ({abortSignal:async () => ({data:{tripId,revision:3,...confirmed},error:null})}));
    repo=new SupabaseTripTimezoneRepository({rpc} as unknown as SupabaseClient<Database>,()=>session);
  });
  test('one bounded explicit write with no provider/native side effects', async () => {
    expect(await repo.set(command)).toEqual({tripId,revision:3,...confirmed});
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('set_trip_timezone',{p_command:command});
  });
  test('explicit clear', async () => {
    rpc.mockImplementation(()=>({abortSignal:async()=>({data:{tripId,revision:3,...empty},error:null})}));
    expect(await repo.set({...command,timezone:null})).toEqual({tripId,revision:3,...empty});
  });
  test.each(['signout','switch','newSession','expired'])('reject late %s', async change => {
    rpc.mockImplementation(()=>({abortSignal:async()=>{
      if(change==='signout') session=null;
      else if(change==='switch') session={...session!,user:{...session!.user,id:'foreign' as UserId}};
      else if(change==='newSession') session={...session!};
      else session!.expiresAt=1;
      return {data:{tripId,revision:3,...confirmed},error:null};
    }}));
    await expect(repo.set(command)).rejects.toMatchObject({code:'unauthorized'});
  });
  test.each(['anonymous','expired'])('deny %s before call',async kind=>{
    if(kind==='anonymous') session=null; else session!.expiresAt=1;
    await expect(repo.set(command)).rejects.toMatchObject({code:'unauthorized'});
    expect(rpc).not.toHaveBeenCalled();
  });
  test.each([{tripId:'foreign'},{revision:8},{timezone:'Europe/Paris'},{provenance:'GOOGLE'},{extra:true}])('invalid result %j',patch=>{
    rpc.mockImplementation(()=>({abortSignal:async()=>({data:{tripId,revision:3,...confirmed,...patch},error:null})}));
    return expect(repo.set(command)).rejects.toMatchObject({code:'invalidResponse'});
  });
  test.each([['TW009','conflict'],['TW008','notFound'],['TW006','unauthorized'],['TW007','invalidRequest']])('safe error %s',async(code,expected)=>{
    rpc.mockImplementation(()=>({abortSignal:async()=>({data:null,error:{code,message:'private SQL'}})}));
    await expect(repo.set(command)).rejects.toMatchObject({code:expected});
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  test('cancelled preflight',async()=>{
    const controller=new AbortController();controller.abort();
    await expect(repo.set(command,controller.signal)).rejects.toMatchObject({code:'cancelled'});
    expect(rpc).not.toHaveBeenCalled();
  });
  test('reject forged provenance before network',async()=>{
    await expect(repo.set({...command,provenance:'USER_CONFIRMED'} as typeof command)).rejects.toMatchObject({code:'invalidRequest'});
    expect(rpc).not.toHaveBeenCalled();
  });
});
