import browserSync from 'browser-sync';
import { exec } from 'child_process';
const bs = browserSync.create();

exec('node build.mjs --dev --watch', (err, stdout, stderr) => {
	if (err) console.error(stderr || err);
	else console.log(stdout);
});

bs.init({
	server: 'dist',
	files: ['dist/**/*.html', 'dist/**/*.js'],
	open: true,
	notify: false,
	port: 3000,
	watch: true,
});
