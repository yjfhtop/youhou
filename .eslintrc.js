module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ['airbnb-base', 'plugin:prettier/recommended'],
    overrides: [],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    rules: {
        indent: [
            2,
            4,
            {
                SwitchCase: 1,
            },
        ],
        'no-param-reassign': 'off',
    },
};
