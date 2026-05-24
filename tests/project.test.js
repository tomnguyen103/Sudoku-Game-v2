const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const requiredFiles = [
  'src/solver.js',
  'src/generator.js',
  'src/visualizer.js',
  'vendor/alpine.min.js',
  'vendor/tailwindcss.js',
  'docs/release-checklist.md',
  'tests/smoke.test.js',
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
}

const readme = read('README.md');
assert.ok(readme.includes('Sudoku Solver Visualizer'), 'README describes the visualizer');
assert.ok(readme.includes('Finish Now'), 'README documents Finish Now');
assert.ok(!readme.includes('3 mistakes ends the game'), 'README no longer describes old mistake flow');
assert.ok(!readme.includes('4 difficulty levels'), 'README no longer describes old Expert mode flow');

const agents = read('AGENTS.md');
assert.ok(agents.includes('Sudoku Solver Visualizer'), 'AGENTS guide describes the visualizer');
assert.ok(!agents.includes('Personal best'), 'AGENTS guide no longer describes removed personal best flow');

const index = read('index.html');
assert.ok(index.includes('vendor/tailwindcss.js'), 'index loads local Tailwind runtime');
assert.ok(index.includes('vendor/alpine.min.js'), 'index loads local Alpine runtime');
assert.ok(!index.includes('cdn.tailwindcss.com'), 'index does not depend on Tailwind CDN');
assert.ok(!index.includes('cdn.jsdelivr.net'), 'index does not depend on jsDelivr');

const sw = read('sw.js');
assert.ok(sw.includes('/vendor/tailwindcss.js'), 'service worker precaches Tailwind runtime');
assert.ok(sw.includes('/vendor/alpine.min.js'), 'service worker precaches Alpine runtime');
assert.ok(sw.includes('/src/solver.js'), 'service worker precaches solver module');
assert.ok(sw.includes('/src/generator.js'), 'service worker precaches generator module');
assert.ok(sw.includes('/src/visualizer.js'), 'service worker precaches visualizer module');

console.log('All project setup tests passed.');
