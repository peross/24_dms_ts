import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config({
  extends: [js.configs.recommended, ...tseslint.configs.recommended, reactPlugin.configs.recommended],
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['dist/**'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node
    }
  },
  plugins: {
    'react-hooks': reactHooks
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
});

