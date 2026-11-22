import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const homepage = read('index.html');
const script = read('blue-friday.js');
const expires = /id="blueFridayBanner"[^>]*data-expires="([^"]+)"[^>]*\s+hidden>/.exec(homepage)?.[1];

function loadBanner(date) {
    const banner = { hidden: true, dataset: { expires } };
    let now = Date.parse(date);
    const timers = new Map();
    const events = new Map();
    const addEventListener = (event, handler) => events.set(event, handler);

    vm.runInNewContext(script, {
        Date: { now: () => now, parse: Date.parse },
        document: { getElementById: () => banner, addEventListener },
        window: { addEventListener },
        clearTimeout: timer => timers.delete(timer),
        setTimeout(callback, delay) {
            const timer = Symbol();
            timers.set(timer, { callback, delay });
            return timer;
        }
    });

    return { banner, timers, events, advanceTo: date => { now = Date.parse(date); } };
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
