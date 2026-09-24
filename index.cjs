// Kept as CommonJS so ncc emits a CommonJS bundle: its ESM output leaves require() calls for Node built-ins, which fail at runtime.
const { run } = require('./run.js');

run();
