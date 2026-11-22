import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const homepage = read('index.html');
const script = read('blue-friday.js');
const expires = /id="blueFridayBanner"[^>]*data-expires="([^"]+)"[^>]*\s+hidden>/.exec(homepage)?.[1];

function loadBanner(date, { denied = false, reducedMotion = false, legacy = false } = {}) {
    let now = Date.parse(date);
    const timers = new Map();
    const events = new Map();
    const addEventListener = (event, handler) => events.set(event, handler);
    const writes = [];
    const status = { textContent: '' };
    const confetti = {
        children: [],
        replaceChildren(...children) { this.children = children; }
    };
    const button = {
        querySelector: () => ({ textContent: 'BLUEFRIDAY' }),
        addEventListener,
        focus() { this.focused = true; }
    };
    const elements = {
        '.sale-code': button,
        '.sale-copy-status': status,
        '.sale-copy-confetti': confetti
    };
    const banner = { hidden: true, dataset: { expires }, querySelector: selector => elements[selector] };
    const field = { select() { this.selected = true; }, remove() { this.removed = true; } };

    vm.runInNewContext(script, {
        Date: { now: () => now, parse: Date.parse },
        document: {
            getElementById: () => banner,
            addEventListener,
            createElement: tag => tag === 'textarea' ? field : { style: { setProperty() {} } },
            body: { appendChild() {} },
            execCommand(command) {
                assert.equal(command, 'copy');
                assert.equal(field.selected, true);
                writes.push(field.value);
                return true;
            }
        },
        window: { addEventListener, isSecureContext: true, matchMedia: () => ({ matches: reducedMotion }) },
        navigator: {
            clipboard: legacy ? undefined : {
                async writeText(value) {
                    if (denied) throw new Error('Permission denied');
                    writes.push(value);
                }
            }
        },
        clearTimeout: timer => timers.delete(timer),
        setTimeout(callback, delay) {
            const timer = Symbol();
            timers.set(timer, { callback, delay });
            return timer;
        }
    });

    return { banner, timers, events, writes, status, confetti, field, button, advanceTo: date => { now = Date.parse(date); } };
}

test('the sale banner is initially hidden and can show before the sale begins', () => {
    assert.equal(expires, '2026-12-01T00:00:00-06:00');
    assert.equal(loadBanner('2026-11-21T20:00:00-06:00').banner.hidden, false);
});

test('the sale banner hides at midnight Central even on an open page', () => {
    const { banner, timers, advanceTo } = loadBanner('2026-12-01T05:59:59.999Z');
    assert.equal(banner.hidden, false);
    const [{ callback, delay }] = [...timers.values()];
    assert.equal(delay, 1);

    advanceTo('2026-12-01T06:00:00Z');
    callback();
    assert.equal(banner.hidden, true);
    assert.equal(timers.size, 0);
    assert.equal(loadBanner('2026-12-01T06:00:00Z').banner.hidden, true);
});

test('a page restored after midnight rechecks the banner expiration', () => {
    const { banner, events, advanceTo } = loadBanner('2026-11-30T12:00:00-06:00');
    advanceTo('2026-12-01T00:01:00-06:00');
    events.get('pageshow')();
    assert.equal(banner.hidden, true);
});

const saleDate = '2026-11-27T12:00:00-06:00';

test('copying writes the code and briefly shows confirmation and confetti', async () => {
    const { events, timers, writes, status, confetti } = loadBanner(saleDate);
    await events.get('click')();
    assert.deepEqual(writes, ['BLUEFRIDAY']);
    assert.equal(status.textContent, 'Copied!');
    assert.ok(confetti.children.length > 0);

    const feedback = [...timers.values()].find(timer => timer.delay === 1800);
    feedback.callback();
    assert.equal(status.textContent, '');
    assert.equal(confetti.children.length, 0);
});

test('a rejected clipboard request leaves the code visible and skips the celebration', async () => {
    const { events, writes, status, confetti } = loadBanner(saleDate, { denied: true });
    await events.get('click')();
    assert.deepEqual(writes, []);
    assert.equal(status.textContent, 'Couldn’t copy');
    assert.equal(confetti.children.length, 0);
});

test('reduced motion keeps the copy confirmation without confetti', async () => {
    const { events, status, confetti } = loadBanner(saleDate, { reducedMotion: true });
    await events.get('click')();
    assert.equal(status.textContent, 'Copied!');
    assert.equal(confetti.children.length, 0);
});

test('copying falls back and restores focus when the Clipboard API is unavailable', async () => {
    const { events, writes, status, field, button } = loadBanner(saleDate, { legacy: true });
    await events.get('click')();
    assert.deepEqual(writes, ['BLUEFRIDAY']);
    assert.equal(status.textContent, 'Copied!');
    assert.equal(field.removed, true);
    assert.equal(button.focused, true);
});
