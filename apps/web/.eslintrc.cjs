/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  ignorePatterns: ['src/assets/lib/tinymce/**', 'dist/**', 'build/**', 'coverage/**', 'public/generated/**'],
  extends: ['plugin:vue/vue3-essential', 'eslint:recommended', '@vue/eslint-config-typescript', 'plugin:oxlint/all'],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
    'no-extra-semi': 'off',
    'vue/no-undef-components': 'error',
    'vue/component-name-in-template-casing': ['error', 'PascalCase', { registeredComponentsOnly: false }],
    'vue/no-restricted-syntax': [
      'warn',
      {
        selector: "VElement[rawName='button']",
        message: 'Review this native control against DESIGN.md#controls-and-values.',
      },
      {
        selector: "VElement[rawName='input']:not(:has(VStartTag:has(VAttribute[key.name='type'][value.value='hidden'])))",
        message: 'Review this native control against DESIGN.md#controls-and-values.',
      },
      {
        selector: "VElement[rawName='select'], VElement[rawName='textarea']",
        message: 'Review this native control against DESIGN.md#controls-and-values.',
      },
      {
        selector: "VAttribute[directive=true][key.name.name='slot'][key.argument.name=/^(create-action|row-actions|row-actions-view|row-actions-edit|row-actions-delete|actions)$/]",
        message: 'Review this standard-control replacement against DESIGN.md#controls-and-values.',
      },
    ],
  },
  overrides: [
    {
      files: ['*.config.js', '*.config.cjs', '**/*.config.js', '**/*.config.cjs', 'postcss.config.js', 'tailwind.config.js'],
      env: { node: true },
    },
    {
      files: ['src/routes/**/*.vue', 'src/assets/corporate/common/*.vue', 'src/components/navigations/sidebar/**/*.vue'],
      rules: { 'vue/multi-word-component-names': 'off' },
    },
    {
      files: ['src/**/*.spec.ts'],
      rules: {
        'vue/multi-word-component-names': 'off',
        'vue/no-reserved-component-names': 'off',
      },
    },
    {
      files: ['src/routes/(public)/auth/login/index.route.vue'],
      rules: { 'no-empty': 'off' },
    },
    {
      files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}'],
      rules: { '@typescript-eslint/no-unused-vars': 'off' },
    },
  ],
}
