#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chokidar from 'chokidar';
import chalk from 'chalk';
import fsExtra from 'fs-extra';

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

function buildAll() {
	processHtmlFile('src/index.html', 'dist/index.html');

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

buildAll();

// Copy assets folder
const srcAssets = path.join('src', 'assets');
const distAssets = path.join('dist', 'assets');

if (fs.existsSync(srcAssets)) {
	fsExtra.copySync(srcAssets, distAssets);
	console.log(chalk.green(`📁 Copied assets to dist/assets`));
} else {
	console.warn(chalk.yellow(`⚠️  No src/assets folder to copy.`));
}

if (isWatch) {
	console.log(chalk.yellow('👀 Watching for changes...'));
	chokidar
		.watch('src', { ignoreInitial: true })
		.on('all', (event, filePath) => {
			console.log(chalk.blue(`🔄 Change detected: ${filePath}`));
			try {
				if (filePath.includes('assets')) {
					fsExtra.copySync(srcAssets, distAssets);
					console.log(chalk.green(`📁 Updated assets.`));
				} else {
					buildAll();
				}
			} catch (e) {
				console.error(chalk.red('❌ Build failed:'), e.message);
			}
		});
}
