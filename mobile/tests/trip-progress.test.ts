import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedSession, SavedTripDetail, UserId } from '../src/integration/contracts';
import type { Database } from '../src/lib/supabase/database.types';
import { mapWorkspaceMutationError } from '../src/integration/errors';
import { SupabaseTripProgressRepository } from '../src/integration/remote/supabaseTripProgressRepository';
import {
  isProgressTransition, mapTripProgressError, parseProgressEventPage, parseTripProgressEvent,
  parseTripProgressState, projectTripProgress, validateProgressReadRequest,
} from '../src/integration/tripProgress';

const tripId = '76000000-0000-4000-8000-000000000001';
const dayId = '76000000-0000-4000-8000-000000000011';
const itemId = '76000000-0000-4000-8000-000000000021';
const event = { id:'76000000-0000-4000-8000-000000000031',tripId,itemId,revision:4,
  idempotencyKey:`${itemId}:4`,fromStatus:'scheduled',toStatus:'completed',occurredAt:'2028-01-01T00:00:00+00:00' };
const graph = (status='completed') => ({ id:tripId,workspaceRevision:4,
  days:[{ id:dayId,items:[{id:itemId,activityStatus:status}] }] }) as SavedTripDetail;
const state = { tripId,revision:4,days:[{dayId,scheduled:0,completed:1,skipped:0}] };

describe('canonical lifecycle progress', () => {
  test.each([
    ['scheduled','completed',true],['scheduled','skipped',true],['completed','scheduled',true],['skipped','scheduled',true],
    ['completed','skipped',false],['skipped','completed',false],['scheduled','scheduled',false],['completed','ARRIVED',false],
  ])('transition %s to %s = %s',(from,to,valid) => expect(isProgressTransition(from,to)).toBe(valid));
  test('canonical event identity',() => expect(parseTripProgressEvent(event)).toEqual(event));
  test.each([
    {id:'bad'}, {tripId:'bad'}, {itemId:'bad'}, {revision:0}, {revision:1.5},
    {idempotencyKey:'client-clock'}, {occurredAt:'2028-01-01T00:00:00'}, {occurredAt:'2028-02-30T12:00:00Z'},
    {occurredAt:'2028-01-01T00:00:00+14:30'}, {ownerId:'forged'}, {payload:{anything:true}},
    {toStatus:'ARRIVED'}, {fromStatus:'completed',toStatus:'skipped'},
  ])('reject malformed event %j', patch => expect(() => parseTripProgressEvent({...event,...patch})).toThrow());
  test.each(['2027-12-31T23:59:59-12:00','2028-01-01T00:00:00+14:00','2028-01-01T00:00:00Z'])('explicit instant %s',occurredAt => {
    expect(parseTripProgressEvent({...event,occurredAt}).occurredAt).toBe(occurredAt);
  });
  test.each(['completed','skipped'])('legacy %s requires no synthetic history',status => {
    const detail=graph(status); delete detail.workspaceRevision;
    expect(projectTripProgress(detail)).toMatchObject({revision:null,counts:{[status]:1},calendar:'unavailable_timezone'});
  });
  test('reversal reflects current lifecycle without deleting history',() => {
    expect(projectTripProgress(graph('scheduled')).counts).toEqual({scheduled:1,completed:0,skipped:0});
    expect(parseTripProgressEvent(event).toStatus).toBe('completed');
  });
  test('deterministic and does not read schedule/location/clock',() => {
    const detail=graph();
    for(const name of ['startDate','endDate','latitude','longitude']) Object.defineProperty(detail,name,{get:()=>{throw Error('Must not read');}});
    const now=jest.spyOn(Date,'now').mockImplementation(()=>{throw Error('Clock');});
    try { expect(projectTripProgress(detail)).toEqual(projectTripProgress(detail)); }
    finally { now.mockRestore(); }
  });
  test.each(['UTC','Pacific/Kiritimati','Etc/GMT+12','America/New_York'])('timezone independent %s',zone => {
    const previous=process.env.TZ; process.env.TZ=zone;
    try { expect(projectTripProgress(graph())).toEqual({...parseTripProgressState(state)}); }
    finally { if(previous===undefined) delete process.env.TZ; else process.env.TZ=previous; }
  });
  test('reject duplicate graph items',() => {
    const detail=graph(); detail.days[0].items.push(detail.days[0].items[0]);
    expect(()=>projectTripProgress(detail)).toThrow();
  });
  test('reject unknown lifecycle',() => expect(()=>projectTripProgress(graph('ARRIVED'))).toThrow());
  test('empty graph has factual zeros',() => expect(projectTripProgress({...graph(),days:[]}).counts).toEqual({scheduled:0,completed:0,skipped:0}));
});
describe('bounded progress transport',() => {
  test.each([{kind:'events',limit:51},{kind:'events',limit:0},{kind:'events',limit:1,beforeRevision:null},
    {kind:'state',timezone:'UTC'},{kind:'state',ownerId:'x'},{kind:'ARRIVED'}])('invalid request %j',extra => {
    expect(()=>validateProgressReadRequest({tripId,...extra})).toThrow();
  });
  test('keyset limit plus sentinel',() => {
    const next={...event,id:'76000000-0000-4000-8000-000000000032',revision:3,idempotencyKey:`${itemId}:3`};
    expect(parseProgressEventPage([event,next],{tripId,kind:'events',limit:1})).toEqual({events:[event],nextBeforeRevision:4});
  });
  test.each([{events:[event,event]},{events:[{...event,tripId:dayId}]}])('reject duplicate or foreign events',({events}) => {
    expect(()=>parseProgressEventPage(events,{tripId,kind:'events',limit:2})).toThrow();
  });
  test.each([
    ['TW006','unauthorized'],['TW008','notFound'],['TW009','conflict'],['TW012','invalidRequest'],
    ['TW023','conflict'],['TW022','invalidRequest'],['TW024','persistenceFailed'],['XX000','persistenceFailed'],
  ])('sanitized %s',(code,expected)=>{
    const error=mapTripProgressError({code,message:'SECRET SQL TABLE'});
    expect(error.code).toBe(expected); expect(error.message).not.toContain('SECRET');
  });
  test('distinct conflict reasons',()=>{
    expect(mapTripProgressError({code:'TW009'})).toMatchObject({reason:'staleRevision'});
    expect(mapTripProgressError({code:'TW023'})).toMatchObject({reason:'idempotencyConflict'});
  });
  test('workspace surfaces atomic event persistence failure safely',()=>{
    expect(mapWorkspaceMutationError({code:'TW024',message:'SQL details'})).toMatchObject({code:'persistenceFailed'});
  });
});
describe('repository authorization and no side effects',()=>{
  let session: AuthenticatedSession|null;
  let rpc: jest.Mock;
  let repo: SupabaseTripProgressRepository;
  beforeEach(()=>{
    session={user:{id:tripId as UserId,email:null,displayName:null},expiresAt:null};
    rpc=jest.fn(()=>({abortSignal:jest.fn(async()=>({data:state,error:null}))}));
    repo=new SupabaseTripProgressRepository({rpc} as unknown as SupabaseClient<Database>,()=>session);
  });
  test('one validated read, no write/provider/notification path',async()=>{
    expect(await repo.getState(tripId)).toEqual(parseTripProgressState(state));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('read_trip_progress',{p_request:{tripId,kind:'state'}});
  });
  test('anonymous rejected before network',async()=>{
    session=null; await expect(repo.getState(tripId)).rejects.toMatchObject({code:'unauthorized'}); expect(rpc).not.toHaveBeenCalled();
  });
  test('expired rejected before network',async()=>{
    session!.expiresAt=1; await expect(repo.getState(tripId)).rejects.toMatchObject({code:'unauthorized'}); expect(rpc).not.toHaveBeenCalled();
  });
  test('session switch suppresses stale response',async()=>{
    rpc.mockImplementation(()=>({abortSignal:async()=>{session={...session!,user:{...session!.user,id:dayId as UserId}};return {data:state,error:null};}}));
    await expect(repo.getState(tripId)).rejects.toMatchObject({code:'unauthorized'});
  });
  test('cancelled means zero call',async()=>{
    const controller=new AbortController();controller.abort();
    await expect(repo.getState(tripId,controller.signal)).rejects.toMatchObject({code:'cancelled'});expect(rpc).not.toHaveBeenCalled();
  });
  test('bad input means zero call',async()=>{
    await expect(repo.getState('bad')).rejects.toMatchObject({code:'invalidRequest'});expect(rpc).not.toHaveBeenCalled();
  });
  test('foreign response rejected',async()=>{
    rpc.mockImplementation(()=>({abortSignal:async()=>({data:{...state,tripId:dayId},error:null})}));
    await expect(repo.getState(tripId)).rejects.toMatchObject({code:'invalidResponse'});
  });
});
