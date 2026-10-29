import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../toys-r-us.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const launchDate = html.match(/datetime="([^"]+)" data-toys-launch/)[1];

function visit(at) {
    let now = Date.parse(at);
    let timer;
    let nextDelay;
    const listeners = {};
    const announcement = { dateTime: launchDate, textContent: '' };
    const document = {
        hidden: false,
        querySelector: () => announcement,
        addEventListener: (event, callback) => { listeners[event] = callback; },
    };
    vm.runInNewContext(source, {
        document,
        window: { addEventListener: (event, callback) => { listeners[event] = callback; } },
        Date: { parse: Date.parse, now: () => now },
        setTimeout: (callback, delay) => { timer = callback; nextDelay = delay; return 1; },
        clearTimeout: () => { timer = undefined; nextDelay = undefined; },
    });
    return {
        announcement, document, listeners,
        get nextDelay() { return nextDelay; },
        setTime: at => { now = Date.parse(at); },
        tick: () => timer(),
    };
}

test('Toys R Us announces 11 AM Central until the release instant, regardless of visitor time zone', () => {
    const page = visit('2026-10-30T11:59:59-04:00'); // Same instant as 10:59:59 CDT.
    assert.equal(page.announcement.textContent, 'Arriving October 30 · 11 a.m. Central');
    assert.equal(page.nextDelay, 1000);
    page.setTime('2026-10-30T16:00:00Z');
    page.tick();
    assert.equal(page.announcement.textContent, 'Now in the Village · Classic & holiday canvases');
    assert.equal(page.nextDelay, undefined);
});

test('a page opened after release immediately shows available copy without scheduling a timer', () => {
    const page = visit('2026-11-01T12:00:00Z');
    assert.equal(page.announcement.textContent, 'Now in the Village · Classic & holiday canvases');
    assert.equal(page.nextDelay, undefined);
});

test('a backgrounded or restored page catches up after release', () => {
    for (const event of ['visibilitychange', 'pageshow', 'focus']) {
        const page = visit('2026-10-28T12:00:00Z');
        assert.equal(page.nextDelay, 60_000);
        page.setTime('2026-10-30T16:00:00Z');
        page.listeners[event]();
        assert.equal(page.announcement.textContent, 'Now in the Village · Classic & holiday canvases');
        assert.equal(page.nextDelay, undefined);
    }
});
