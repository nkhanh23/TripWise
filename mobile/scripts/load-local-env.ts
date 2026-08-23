/* eslint-disable @typescript-eslint/no-require-imports */
type FsModule = {
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: 'utf8') => string;
};
type PathModule = { resolve: (...parts: string[]) => string };
declare function require(moduleName: 'fs'): FsModule;
declare function require(moduleName: 'path'): PathModule;

const { existsSync, readFileSync } = require('fs');

function resolve(...parts: string[]): string {
  return require('path').resolve(...parts);
}

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    const raw = match[2];
    values[match[1]] = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1)
      : raw;
  }
  return values;
}

/** Loads project-local env files without overriding explicit process variables. */
export function loadLocalEnv(): void {
  const merged = {
    ...parseEnvFile(resolve(process.cwd(), '.env')),
    ...parseEnvFile(resolve(process.cwd(), '.env.local')),
  };
  for (const [name, value] of Object.entries(merged)) {
    if (process.env[name] === undefined) process.env[name] = value;
  }
}
