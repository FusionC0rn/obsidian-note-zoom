import esbuild from 'esbuild';
import process from 'process';
import fs from 'fs';

// Node 内建模块清单（替代已弃用的 builtin-modules 包）
const builtins = [
	'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto',
	'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 'module', 'net', 'os',
	'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl',
	'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url',
	'util', 'v8', 'vm', 'worker_threads', 'zlib',
];

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf-8'));

const banner = `/**
 * @name: ${manifest.name}
 * @author: ${pkg.author}
 * @version: ${manifest.version}
 */
`;

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
	banner: { js: banner },
	entryPoints: ['src/main.ts'],
	bundle: true,
	external: [
		'obsidian',
		'electron',
		'@codemirror/autocomplete',
		'@codemirror/collab',
		'@codemirror/commands',
		'@codemirror/language',
		'@codemirror/lint',
		'@codemirror/search',
		'@codemirror/state',
		'@codemirror/view',
		'@lezer/common',
		'@lezer/highlight',
		'@lezer/lr',
		...builtins,
	],
	format: 'cjs',
	target: 'es2018',
	logLevel: 'info',
	sourcemap: prod ? false : 'inline',
	treeShaking: true,
	outfile: 'main.js',
	minify: prod,
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.rebuild();
	process.exit(0);
}
