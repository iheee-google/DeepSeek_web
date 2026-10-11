// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * 规则依据 docs/HARNESS-RULES.md §6 品味不变式。
 * 每条自定义规则的 message 内嵌修复指令（Harness §6.2）。
 */
export default tseslint.config(
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'docs/generated/',
      'prototypes/shots/',
      'godfather-trilogy-notes-v4/',
      'prototypes/assets/',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // T5：禁止 YOLO 式探测。可选链与 truthy 转换掩盖了「字段不存在」这一真实问题。
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // T2：结构化日志，禁止字符串拼接。改用具名参数的对象形式。
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // 明确的修复指令式报错
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'no-implicit-coercion': 'error',
    },
  },

  {
    // 构建脚本允许写 stdout
    files: ['scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },

  {
    // Astro 文件里 <script> 内联脚本需要浏览器全局
    files: ['**/*.astro'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
);
