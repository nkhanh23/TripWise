// Separate Node processes ensure TZ changes actually reach the runtime.
// Named zones below simulate devices; none is a destination timezone contract.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
if (process.argv[2] === '--worker') {
  const ts = require('typescript');
  require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  const { projectTripProgress } = require('../src/integration/tripProgress.ts');
  const offset = new Date('2028-01-01T00:00:00Z').getTimezoneOffset();
  assert.equal(offset,Number(process.argv[3]));
  const originalNow=Date.now;
  Date.now=()=>{throw Error('Implicit clock');};
  for(const activityStatus of ['scheduled','completed','skipped']) {
    const result=projectTripProgress({id:'76000000-0000-4000-8000-000000000001',workspaceRevision:4,
      startDate:'2028-01-01',days:[{id:'76000000-0000-4000-8000-000000000011',date:'2028-01-01',
        items:[{id:'76000000-0000-4000-8000-000000000021',activityStatus,startTime:'00:01'}]}]});
    assert.deepEqual(result.counts,{scheduled:Number(activityStatus==='scheduled'),completed:Number(activityStatus==='completed'),skipped:Number(activityStatus==='skipped')});
    assert.equal(result.calendar,'unavailable_timezone');
  }
  const { parseTripTimezone } = require('../src/integration/tripTimezone.ts');
  const confirmed={timezone:'America/New_York',provenance:'USER_CONFIRMED',confirmedAt:'2026-09-13T12:00:00Z'};
  assert.deepEqual(parseTripTimezone(confirmed),confirmed);
  assert.equal(projectTripProgress({id:'76000000-0000-4000-8000-000000000001',timezone:confirmed,days:[]}).calendar,'available_user_confirmed');
  Date.now=originalNow;
  console.log(JSON.stringify({deviceTimezone:process.env.TZ,offsetMinutes:offset,lifecycleCases:3,result:'PASS'}));
} else {
  for(const [TZ,offset] of [['UTC',0],['Pacific/Kiritimati',-840],['Etc/GMT+12',720],['America/New_York',300],['Asia/Ho_Chi_Minh',-420]]) {
    const result=spawnSync(process.execPath,[path.resolve(__filename),'--worker',String(offset)],{env:{...process.env,TZ},encoding:'utf8'});
    process.stdout.write(result.stdout);process.stderr.write(result.stderr);
    assert.equal(result.status,0);
  }
  console.log('TRIP_PROGRESS_TIMEZONE_PROCESSES_PASS');
}
