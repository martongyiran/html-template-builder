// --- Copied functions from build.mjs for isolated testing ---

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

// --- Tests ---

describe('parseTemplateTag', () => {
	it('parses a simple template tag with no params', () => {
		const line = '<!-->HEADER<-->';
		expect(parseTemplateTag(line)).toEqual({
			templateName: 'header',
			params: {},
		});
	});

	it('parses a template tag with one param', () => {
		const line = '<!-->FOOTER:::COPYRIGHT:::(((2024 MySite)))<-->';
		expect(parseTemplateTag(line)).toEqual({
			templateName: 'footer',
			params: { COPYRIGHT: '2024 MySite' },
		});
	});

	it('parses a template tag with multiple params', () => {
		const line = '<!-->CARD:::TITLE:::(((Hello))):::DESC:::(((World)))<-->';
		expect(parseTemplateTag(line)).toEqual({
			templateName: 'card',
			params: { TITLE: 'Hello', DESC: 'World' },
		});
	});

	it('returns null for non-matching lines', () => {
		expect(parseTemplateTag('<!-- Not a tag -->')).toBeNull();
		expect(parseTemplateTag('Some random text')).toBeNull();
	});
});

describe('applyParams', () => {
	it('replaces a single param', () => {
		const content = '<div>:::TITLE:::</div>';
		const params = { TITLE: 'Hello' };
		expect(applyParams(content, params)).toBe('<div>Hello</div>');
	});

	it('replaces multiple params', () => {
		const content = '<h1>:::TITLE:::</h1><p>:::BODY:::</p>';
		const params = { TITLE: 'Hi', BODY: 'Welcome' };
		expect(applyParams(content, params)).toBe('<h1>Hi</h1><p>Welcome</p>');
	});

	it('replaces all occurrences of a param', () => {
		const content = ':::WORD::: :::WORD:::';
		const params = { WORD: 'repeat' };
		expect(applyParams(content, params)).toBe('repeat repeat');
	});

	it('does nothing if param is not present', () => {
		const content = '<div>No params here</div>';
		const params = { TITLE: 'Hello' };
		expect(applyParams(content, params)).toBe('<div>No params here</div>');
	});
});
