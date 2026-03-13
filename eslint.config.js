const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.commonjs,
                ...globals.es2017,
                ...globals.jest,
                ...globals.node,
                Atomics: 'readonly',
                SharedArrayBuffer: 'readonly',
            },
        },
    },
    {
        ignores: ['dist/'],
    },
];
