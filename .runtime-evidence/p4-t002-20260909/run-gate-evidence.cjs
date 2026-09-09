// Gate evidence runner for FEATURE-P4-T002 closure. No credential storage or production modifications.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const evidenceDir = __dirname;
const rootDir = path.resolve(__dirname, '../..');
const mobileDir = path.join(rootDir, 'mobile');

const gates = [
  {
    name: 'mobile-lint',
    command: 'npm',
    args: ['run', 'lint'],
    cwd: mobileDir,
    rawFile: 'gate-lint-raw.txt',
    exitFile: 'gate-lint-exit.txt',
  },
  {
    name: 'mobile-typecheck',
    command: 'npm',
    args: ['run', 'typecheck'],
    cwd: mobileDir,
    rawFile: 'gate-typecheck-raw.txt',
    exitFile: 'gate-typecheck-exit.txt',
  },
  {
    name: 'mobile-focused-jest',
    command: 'npm',
    args: ['test', '--', '--runInBand', 'place-intelligence.test.ts'],
    cwd: mobileDir,
    rawFile: 'gate-focused-jest-raw.txt',
    exitFile: 'gate-focused-jest-exit.txt',
  },
  {
    name: 'mobile-full-jest',
    command: 'npm',
    args: ['test', '--', '--runInBand'],
    cwd: mobileDir,
    rawFile: 'gate-full-jest-raw.txt',
    exitFile: 'gate-full-jest-exit.txt',
  },
  {
    name: 'mobile-expo-doctor',
    command: 'npx',
    args: ['expo-doctor'],
    cwd: mobileDir,
    rawFile: 'gate-expo-doctor-raw.txt',
    exitFile: 'gate-expo-doctor-exit.txt',
  },
  {
    name: 'edge-deno-check',
    command: 'deno',
    args: ['check', 'supabase/functions/get-place-metadata/index.ts'],
    cwd: rootDir,
    rawFile: 'gate-deno-check-raw.txt',
    exitFile: 'gate-deno-check-exit.txt',
  },
  {
    name: 'edge-deno-lint',
    command: 'deno',
    args: ['lint', 'supabase/functions/get-place-metadata/'],
    cwd: rootDir,
    rawFile: 'gate-deno-lint-raw.txt',
    exitFile: 'gate-deno-lint-exit.txt',
  },
  {
    name: 'edge-deno-test',
    command: 'deno',
    args: ['test', '--allow-env', 'supabase/functions/get-place-metadata/'],
    cwd: rootDir,
    rawFile: 'gate-deno-test-raw.txt',
    exitFile: 'gate-deno-test-exit.txt',
  },
  {
    name: 'edge-t001-regression',
    command: 'deno',
    args: ['test', '-A', 'supabase/functions/explore-places/'],
    cwd: rootDir,
    rawFile: 'gate-t001-regression-raw.txt',
    exitFile: 'gate-t001-regression-exit.txt',
  },
];

const results = [];

for (const g of gates) {
  console.log(`[GATE START] ${g.name} (${g.command} ${g.args.join(' ')}) in ${g.cwd}`);
  const startedAt = new Date().toISOString();
  const res = spawnSync(g.command, g.args, {
    cwd: g.cwd,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env },
  });
  const completedAt = new Date().toISOString();
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  const combined = (stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '')).trim();
  const exitCode = res.status !== null ? res.status : 1;

  fs.writeFileSync(path.join(evidenceDir, g.rawFile), combined + '\n', 'utf8');
  fs.writeFileSync(path.join(evidenceDir, g.exitFile), String(exitCode) + '\n', 'utf8');

  console.log(`[GATE END] ${g.name} -> exit code: ${exitCode}`);
  results.push({
    name: g.name,
    command: `${g.command} ${g.args.join(' ')}`,
    cwd: path.relative(rootDir, g.cwd) || '.',
    rawFile: g.rawFile,
    exitFile: g.exitFile,
    exitCode,
    startedAt,
    completedAt,
  });
}

fs.writeFileSync(path.join(evidenceDir, 'gate-results-summary.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
console.log('ALL_GATES_RECORDED_SUCCESSFULLY');
