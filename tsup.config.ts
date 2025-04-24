import {builtinModules} from 'node:module';
import {defineConfig} from 'tsup';

export default defineConfig({
	clean: true,
	entry: ['src/index.ts'],
	external: ['vscode', /^node:/, ...builtinModules],
	noExternal: [
		new RegExp(
			`^(?!vscode$|node:|${builtinModules
				.filter((i) => !i.startsWith('_'))
				.map((i) => i + '$')
				.join('|')})`,
		),
	],
	outDir: 'dist',
	sourcemap: true,
	removeNodeProtocol: false,
	splitting: true,
	minify: true,
	target: 'node20',
	treeshake: true,
});
