const fs = require('fs');
const path = require('path');

describe('HTML Output Tests', () => {
  it('should create dist/index.html', () => {
    const outputPath = path.resolve(__dirname, '../dist/index.html');
    expect(fs.existsSync(outputPath)).toBe(true);
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
    expect(content).not.toMatch(/<!-->.*<-->/);
  });
});
