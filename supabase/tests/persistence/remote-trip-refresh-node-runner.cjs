const { isDeepStrictEqual } = require('node:util');

let testPromise = Promise.resolve();
global.describe = (_name, callback) => callback();
global.describe.skip = () => {};
global.it = (name, callback) => {
  testPromise = testPromise.then(async () => {
    await callback();
    console.log(`PASS ${name}`);
  });
};
global.jest = { setTimeout: () => {} };
global.expect = (actual) => {
  const api = {
    toBe(expected) { if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}.`); },
    toEqual(expected) { if (!isDeepStrictEqual(actual, expected)) throw new Error(`Values are not deeply equal. Actual=${JSON.stringify(actual)} Expected=${JSON.stringify(expected)}`); },
    toHaveLength(expected) { if (actual == null || actual.length !== expected) throw new Error(`Expected length ${expected}; received ${actual?.length}.`); },
    toBeGreaterThan(expected) { if (!(actual > expected)) throw new Error(`Expected ${actual} > ${expected}.`); },
    toBeGreaterThanOrEqual(expected) { if (!(actual >= expected)) throw new Error(`Expected ${actual} >= ${expected}.`); },
    toBeInstanceOf(expected) { if (!(actual instanceof expected)) throw new Error(`Value is not an instance of ${expected?.name}.`); },
  };
  api.not = {
    toBeNull() { if (actual === null) throw new Error('Expected value not to be null.'); },
  };
  return api;
};

(async () => {
  const testPath = process.argv[2];
  if (!testPath) throw new Error('Compiled test path is required.');
  require(testPath);
  await testPromise;
})().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
