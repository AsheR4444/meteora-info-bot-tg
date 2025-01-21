import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"


/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['node_modules/**'], // Исключаем папку node_modules
  },
  {
    rules: {
      semi: ['error', 'never'], // Отключаем точки с запятой
      indent: ['error', 2], // Устанавливаем отступы в 2 пробела
      "@typescript-eslint/no-unused-vars": "warn",
      "object-curly-spacing": ["error", "always"], // Пробелы внутри фигурных скобок
      "@typescript-eslint/ban-ts-comment": "off"
    },
    languageOptions: {
      ecmaVersion: 'latest', // Поддержка последних стандартов JS
      sourceType: 'module',  // Поддержка ESM
    },
    linterOptions: {
      reportUnusedDisableDirectives: true, // Отчёт о неиспользуемых директивах
    },
  }
]