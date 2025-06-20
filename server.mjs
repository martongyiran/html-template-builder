import browserSync from 'browser-sync';
import { spawn } from 'child_process';

const bs = browserSync.create();

const builder = spawn('node', ['build.mjs', '--dev', '--watch'], {
	stdio: ['inherit', 'pipe', 'pipe'],
});

let serverStarted = false;
let reloadTimeout;

builder.stdout.on('data', (data) => {
	const output = data.toString();
	process.stdout.write(output);

	if (!serverStarted && output.includes('✅ Build finished!')) {
		serverStarted = true;

		console.log('\n✅ Server starting...\n');

		bs.init({
			server: 'dist',
			open: true,
			notify: false,
			port: 3000,
			watch: false,
		});
	}

	if (serverStarted && output.includes('🧠 BUILD_DONE')) {
		clearTimeout(reloadTimeout);
		reloadTimeout = setTimeout(() => {
			console.log('♻️  Reload triggered by build');
			bs.reload();
		}, 300);
	}
});

builder.stderr.on('data', (data) => {
	process.stderr.write(data.toString());
});
