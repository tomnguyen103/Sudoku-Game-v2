const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
let serverPort = 0;

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};

function serveFile(req, res) {
  const url = new URL(req.url, `http://127.0.0.1:${serverPort}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(root, pathname));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

async function withServer(fn) {
  const server = http.createServer(serveFile);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  serverPort = server.address().port;
  try {
    await fn();
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function main() {
  await withServer(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    try {
      await page.goto(`http://127.0.0.1:${serverPort}/index.html?smoke=1`, {
        waitUntil: 'networkidle',
      });

      await page.getByText('Select an algorithm and run the solver.').waitFor();
      const initialBackground = await page.locator('body').evaluate(body =>
        getComputedStyle(body).backgroundColor
      );
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await page.waitForFunction(
        previous => getComputedStyle(document.body).backgroundColor !== previous,
        initialBackground
      );
      assert.strictEqual(
        await page.locator('html').evaluate(html => html.classList.contains('dark')),
        true,
        'theme toggle adds the dark class'
      );
      assert.strictEqual(
        await page.evaluate(() => localStorage.getItem('sudoku-dark')),
        'true',
        'theme toggle persists dark mode'
      );
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
      await page.waitForFunction(
        previous => getComputedStyle(document.body).backgroundColor === previous,
        initialBackground
      );

      await page.getByRole('button', { name: 'Run Algorithm' }).click();
      await page.locator('p').filter({ hasText: /Trying \d at row|Backtracking from row/ }).waitFor();
      await page.getByRole('button', { name: 'Pause' }).click();
      await page.getByText('Solver paused.').waitFor();
      await page.getByRole('button', { name: 'Finish Now' }).click();
      await page.getByText('Solved by Backtracking DFS.').waitFor();

      const filledCells = await page.locator('.sudoku-cell').evaluateAll(cells =>
        cells.filter(cell => cell.textContent.trim()).length
      );
      assert.strictEqual(filledCells, 81, 'Finish Now fills every cell');

      await page.getByRole('button', { name: 'Reset' }).click();
      await page.getByText('Select an algorithm and run the solver.').waitFor();
      const resetFilledCells = await page.locator('.sudoku-cell').evaluateAll(cells =>
        cells.filter(cell => cell.textContent.trim()).length
      );
      assert.ok(resetFilledCells < 81, 'Reset restores the unsolved layout');
      assert.deepStrictEqual(errors, [], 'browser console has no errors');
    } finally {
      await browser.close();
    }
  });

  console.log('All browser smoke tests passed.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
