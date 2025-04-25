declare module 'mime-sniffer' {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	import buffer = require('node:buffer');

	const exports: {
		database: Record<string, {mime: string; extension: string}>;
		lookup(
			file: string | buffer.Buffer,
			done: (error: unknown, info: {mime: string; extension: string}) => void,
		): void;
	};

	export = exports;
}
