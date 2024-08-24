import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginNode from 'eslint-plugin-n'
import globals from 'globals'

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  pluginNode.configs['flat/recommended-script'],
  {
    ignores: ['dist'],
    plugins: {
      node: pluginNode,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
]
