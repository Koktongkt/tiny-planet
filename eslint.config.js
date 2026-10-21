// Light lint: catch real bugs (undefined names, hook misuse, unreachable code), not style.
import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import hooks from 'eslint-plugin-react-hooks'
export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'screenshots/**', 'tools/**', '*.mjs'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}', 'tests/**/*.{js,mjs}', 'eslint.config.js', 'vite.config.js', 'playwright.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: '18.3' } },
    rules: {
      'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'error', 'react/jsx-no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-unused-vars': 'off', 'no-empty': 'off', 'no-cond-assign': 'off', 'no-sparse-arrays': 'off', 'no-constant-condition': 'off',
      'no-unused-expressions': 'off', 'no-prototype-builtins': 'off', 'no-fallthrough': 'off', 'no-case-declarations': 'off', 'no-useless-escape': 'off',
    },
  },
  // false positive: Activities has a plain helper called use() (spend ingredients), not React's use hook
  { files: ['src/home/Activities.jsx'], rules: { 'react-hooks/rules-of-hooks': 'off' } },
  // Dog.jsx marks a find as seen with a harmless self-assignment (Studio's file; left as is)
  { files: ['src/pets/Dog.jsx'], rules: { 'no-self-assign': 'warn' } },
]
