const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const group = process.argv[2];

const gates = group === 'edge' ? [
  ['edge-check', 'deno', ['check', 'supabase/functions/discover-events/index.ts']],
  ['edge-lint', 'deno', ['lint', 'supabase/functions/discover-events/']],
  ['edge-t003', 'deno', ['test', 'supabase/functions/discover-events/']],
  ['edge-t001', 'deno', ['test', '-A', 'supabase/functions/explore-places/']],
  ['edge-t002', 'deno', ['test', '--allow-env', 'supabase/functions/get-place-metadata/']],
] : group === 'doctor' ? [
  ['doctor', 'npx', ['expo-doctor']]
] : [
  ['lint', 'npm', ['run', 'lint']],
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['focused', 'npm', ['test', '--', '--runInBand', 'intelligence-ui-review.test.tsx']],
  ['full-jest', 'npm', ['test', '--', '--runInBand']],
];

const results = [];
for (const [name, cmd, args] of gates) {
  const cwd = group === 'edge' ? root : path.join(root, 'mobile');
  const startedAt = new Date().toISOString();
  const r = spawnSync(cmd, args, { cwd, shell: true, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  const raw = (r.stdout || '') + (r.stderr || '');
  fs.writeFileSync(path.join(__dirname, name + '-raw.txt'), raw);
  fs.writeFileSync(path.join(__dirname, name + '-exit.txt'), String(r.status) + '\n');
  results.push({ name, command: cmd + ' ' + args.join(' '), cwd, exitCode: r.status, startedAt, finishedAt: new Date().toISOString() });
  fs.writeFileSync(path.join(__dirname, (group || 'mobile') + '-gates.json'), JSON.stringify(results, null, 2));
  console.log(name + ' EXIT=' + r.status + ' ' + raw.split(/\r?\n/).filter(x => /Tests:|Test Suites:|passed.*failed|checks passed/.test(x)).join(' '));
}
