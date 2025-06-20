#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chokidar from 'chokidar';
import chalk from 'chalk';
import fsExtra from 'fs-extra';
import CleanCSS from 'clean-css';
import { minify as terserMinify } from 'terser';
import JavaScriptObfuscator from 'javascript-obfuscator';

dotenv.config();
const BASE_URL = process.env.BASE_URL || '';
const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

function readFileLines(filePath) {
	return fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
}

function writeFileSafe(filePath, content) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, content, 'utf8');
}

function parseTemplateTag(line) {
	const tagPattern = /^<!-->([A-Z0-9_]+(?:::.*?:::.*?)*?)<-->$/;
	const match = line.trim().match(tagPattern);
	if (!match) return null;

	const parts = match[1].split(':::');
	const templateName = parts[0].toLowerCase();
	const params = {};

	for (let i = 1; i < parts.length; i += 2) {
		const key = parts[i];
		const valMatch = parts[i + 1]?.match(/\(\(\((.*?)\)\)\)/s);
		if (valMatch) {
			params[key] = valMatch[1];
		}
	}

	return { templateName, params };
}

function applyParams(content, params) {
	let result = content;
	for (const [key, val] of Object.entries(params)) {
		const paramRegex = new RegExp(`:::${key}:::`, 'g');
		result = result.replace(paramRegex, val);
	}
	return result;
}

function resolveTemplates(lines, baseDir, visited = new Set()) {
	const result = [];

	for (let line of lines) {
		const parsed = parseTemplateTag(line);

		if (parsed) {
			const { templateName, params } = parsed;
			const templatePath = findTemplatePath(baseDir, templateName);

			if (!templatePath || visited.has(templatePath)) {
				console.warn(`Skipping or not found: ${templatePath}`);
				continue;
			}

			visited.add(templatePath);
			let templateContent = fs.readFileSync(templatePath, 'utf8');
			templateContent = applyParams(templateContent, params);
			const templateLines = templateContent.split(/\r?\n/);
			const resolved = resolveTemplates(templateLines, baseDir, visited);
			result.push(...resolved);
		} else {
			result.push(line);
		}
	}

	return result;
}

function findTemplatePath(baseDir, name) {
	const files = fs.readdirSync(baseDir, { withFileTypes: true });

	for (let file of files) {
		const fullPath = path.join(baseDir, file.name);
		if (file.isDirectory()) {
			if (file.name === 'pages') continue;
			const sub = findTemplatePath(fullPath, name);
			if (sub) return sub;
		} else if (file.name.toLowerCase() === `${name}.html`) {
			return fullPath;
		}
	}

	return null;
}

function replaceBaseUrl(lines, currentOutputPath) {
	const actualBase = isDev
		? path
				.relative(path.dirname(currentOutputPath), path.resolve('dist'))
				.replace(/\\/g, '/') || '.'
		: BASE_URL;
	return lines.map((line) => line.replace(/BASE_URL/g, actualBase));
}

function processHtmlFile(srcPath, distPath) {
	const lines = readFileLines(srcPath);
	const resolved = resolveTemplates(lines, path.resolve('src'));
	const finalLines = replaceBaseUrl(resolved, distPath);
	writeFileSafe(distPath, finalLines.join('\n'));
	console.log(chalk.green(`✅ Built: ${distPath}`));
}

function buildSingleHtmlFile(srcPath) {
	const relative = path.relative('src', srcPath);
	if (relative === 'index.html') {
		processHtmlFile(srcPath, 'dist/index.html');
	} else if (relative === '404.html') {
		processHtmlFile(srcPath, 'dist/404.html');
	} else if (relative === '.htaccess') {
		processHtmlFile(srcPath, 'dist/.htaccess');
	} else if (relative.startsWith('pages' + path.sep)) {
		const name = path.parse(relative).name;
		processHtmlFile(srcPath, path.join('dist', name, 'index.html'));
	} else {
		console.warn(chalk.yellow(`⚠️  Unrecognized HTML path: ${srcPath}`));
	}
}

function buildAll() {
	processHtmlFile('src/index.html', 'dist/index.html');

	processHtmlFile('src/404.html', 'dist/404.html');
	processHtmlFile('src/.htaccess', 'dist/.htaccess');

	const pagesDir = path.resolve('src/pages');
	if (fs.existsSync(pagesDir)) {
		const pageFiles = fs.readdirSync(pagesDir);
		for (let file of pageFiles) {
			const fullPath = path.join(pagesDir, file);
			if (fs.statSync(fullPath).isFile() && file.endsWith('.html')) {
				const name = path.parse(file).name;
				const outPath = path.join('dist', name, 'index.html');
				processHtmlFile(fullPath, outPath);
			}
		}
	}
}

function obfuscateJs(jsContent) {
	const obfuscated = JavaScriptObfuscator.obfuscate(jsContent, {
		compact: true,
		controlFlowFlattening: false,
		deadCodeInjection: true,
		debugProtection: false,
		disableConsoleOutput: true,
		identifierNamesGenerator: 'hexadecimal',
		selfDefending: false,
		stringArray: true,
		stringArrayEncoding: ['base64'],
		stringArrayThreshold: 0.75,
	});

	return obfuscated.getObfuscatedCode();
}

function minifyCss(cssContent) {
	return new CleanCSS({}).minify(cssContent).styles;
}

async function minifyJs(jsContent) {
	const result = await terserMinify(jsContent);
	if (result.error) throw result.error;
	return result.code;
}

async function copyAndMinifyAssets(srcDir, distDir) {
	if (!fs.existsSync(srcDir)) {
		console.warn(chalk.yellow(`⚠️  No ${srcDir} folder to copy.`));
		return;
	}

	fsExtra.emptyDirSync(distDir);

	const files = fsExtra.readdirSync(srcDir, { withFileTypes: true });

	for (const file of files) {
		const srcPath = path.join(srcDir, file.name);
		const distPath = path.join(distDir, file.name);

		if (file.isDirectory()) {
			await copyAndMinifyAssets(srcPath, distPath);
		} else if (file.isFile()) {
			const ext = path.extname(file.name).toLowerCase();
			if (ext === '.css') {
				const css = fs.readFileSync(srcPath, 'utf8');
				const minCss = minifyCss(css);
				fsExtra.outputFileSync(distPath, minCss);
				console.log(chalk.green(`🟢 Minified CSS: ${distPath}`));
			} else if (ext === '.js') {
				const js = fs.readFileSync(srcPath, 'utf8');
				try {
					const minJs = await minifyJs(js);
					const obfJs = obfuscateJs(minJs);
					fsExtra.outputFileSync(distPath, obfJs);
					console.log(chalk.green(`🔒 Obfuscated JS: ${distPath}`));
				} catch (e) {
					console.error(
						chalk.red(`❌ JS obfuscation error in ${srcPath}: ${e.message}`)
					);
					fsExtra.copyFileSync(srcPath, distPath);
				}
			} else {
				fsExtra.copyFileSync(srcPath, distPath);
			}
		}
	}
}

// Copy assets folder
const srcAssets = path.join('src', 'assets');
const distAssets = path.join('dist', 'assets');

(async () => {
	buildAll();
	await copyAndMinifyAssets(srcAssets, distAssets);

	console.log(chalk.green(`✅ Build finished!`));

	if (isWatch) {
		console.log(chalk.yellow('👀 Watching for changes...'));
		chokidar
			.watch('src', { ignoreInitial: true })
			.on('all', async (event, filePath) => {
				console.log(chalk.blue(`🔄 Change detected: ${filePath}`));
				try {
					const ext = path.extname(filePath).toLowerCase();

					if (filePath.includes('assets')) {
						const relative = path.relative('src/assets', filePath);
						const outPath = path.join('dist/assets', relative);

						if (ext === '.css') {
							const css = fs.readFileSync(filePath, 'utf8');
							const minCss = minifyCss(css);
							fsExtra.outputFileSync(outPath, minCss);
							console.log(chalk.green(`🟢 Minified CSS: ${outPath}`));
						} else if (ext === '.js') {
							const js = fs.readFileSync(filePath, 'utf8');
							const minJs = await minifyJs(js);
							const obfJs = obfuscateJs(minJs);
							fsExtra.outputFileSync(outPath, obfJs);
							console.log(chalk.green(`🔒 Obfuscated JS: ${outPath}`));
						} else {
							fsExtra.copyFileSync(filePath, outPath);
							console.log(chalk.green(`📁 Copied asset: ${outPath}`));
						}
					} else if (ext === '.html' || filePath.endsWith('.htaccess')) {
						buildSingleHtmlFile(filePath);
					} else {
						console.log(chalk.gray(`ℹ️  Ignored: ${filePath}`));
					}
				} catch (e) {
					console.error(chalk.red('❌ Build failed:'), e.message);
				}
			});
	}
})();
