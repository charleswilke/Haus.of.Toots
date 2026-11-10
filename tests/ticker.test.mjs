import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

// The ticker scrolls with a CSS animation so the browser can run it off the
// main thread and stop it for shoppers who ask for reduced motion. The script
// measures the text once to set the speed and must not animate it itself.

function runInitTicker(ticker) {
    const source = read('index-app.js');
    const start = source.indexOf('initTicker() {');
    const method = source.slice(start, source.indexOf('\n    }\n', start) + '\n    }'.length);
    const frames = [];
    const app = new Function('document', 'requestAnimationFrame', `return ({ ${method} });`)(
        { querySelector: () => ticker },
        callback => { frames.push(callback); }
    );
    app.initTicker();
    return frames;
}

test('the ticker script sets the loop duration once and schedules nothing further', () => {
    const properties = {};
    const ticker = {
        scrollWidth: 2400,
        style: { setProperty(name, value) { properties[name] = value; } },
    };

    const frames = runInitTicker(ticker);
    assert.equal(frames.length, 1);
    frames.shift()(0);

    // Half of 2400px at 24px per second.
    assert.deepEqual(properties, { '--ticker-duration': '50.00s' });
    assert.equal(frames.length, 0, 'no per-frame loop is left running');
    assert.equal(ticker.style.transform, undefined);
});

test('a page without a ticker, or one not laid out yet, is left alone', () => {
    assert.equal(runInitTicker(null).length, 0);

    const properties = {};
    const frames = runInitTicker({ scrollWidth: 0, style: { setProperty(name, value) { properties[name] = value; } } });
    frames.shift()(0);
    assert.deepEqual(properties, {});
});

test('the ticker animates in CSS, loops on its repeated half, and respects reduced motion', () => {
    const css = read('shop-styles.css');
    assert.match(css, /\.ticker \{[^}]*animation: ticker-scroll var\(--ticker-duration, 60s\) linear infinite;/);
    assert.match(css, /@keyframes ticker-scroll \{\s*to \{ transform: translateX\(-50%\); \}\s*\}/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.ticker \{ animation: none; \}\s*\}/);

    // translateX(-50%) only loops seamlessly while the messages appear twice.
    const html = read('index.html');
    const ticker = html.slice(html.indexOf('<div class="ticker">'), html.indexOf('</div>', html.indexOf('<div class="ticker">')));
    const items = [...ticker.matchAll(/<span class="ticker-item">([^<]*)<\/span>/g)].map(([, text]) => text);
    assert.ok(items.length >= 2 && items.length % 2 === 0);
    assert.deepEqual(items.slice(0, items.length / 2), items.slice(items.length / 2));
});
