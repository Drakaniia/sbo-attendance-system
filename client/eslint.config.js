import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';

export default tseslint.config([
	globalIgnores(['dist']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs['recommended-latest'],
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
	},
	{
		// Vendored Bklit UI primitives (MIT). They intentionally co-locate
		// context + helpers with components, which the app's fast-refresh rule
		// rejects; that rule does not apply to third-party source.
		files: ['src/components/charts/bklit/**/*.{ts,tsx}'],
		rules: {
			'react-refresh/only-export-components': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			import: importPlugin,
		},
		settings: {
			// Resolve extensionless/TS imports via tsconfig; fall back to node.
			'import/resolver': {
				typescript: true,
				node: true,
			},
		},
		rules: {
			// Fail on imports that don't resolve to a real file — catches
			// wrong-depth relative paths (e.g. after moving a file/folder).
			'import/no-unresolved': 'error',
		},
	},
]);
