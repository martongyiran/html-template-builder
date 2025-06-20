import browserSync from 'browser-sync';
import { spawn } from 'child_process';

const bs = browserSync.create();

const builder = spawn('node', ['build.mjs', '--dev', '--watch'], {
	stdio: ['inherit', 'pipe', 'pipe'],
});

let serverStarted = false;

builder.stdout.on('data', (data) => {
	const output = data.toString();
	process.stdout.write(output);

	if (!serverStarted && output.includes('✅ Build finished!')) {
		serverStarted = true;

		console.log('\n✅ Server starting...\n');

		bs.init({
			server: 'dist',
			files: ['dist/**/*.html', 'dist/**/*.js', 'dist/**/*.css'],
			open: true,
			notify: false,
			port: 3000,
			watch: true,
		});
	}
});

builder.stderr.on('data', (data) => {
	process.stderr.write(data.toString());
});
