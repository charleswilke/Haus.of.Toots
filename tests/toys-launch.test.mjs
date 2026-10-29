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
    const announcement = { dateTime: launchDate, hidden: false };
    const shopCopy = { hidden: true };
    const arrow = { hidden: true };
    const timeNote = { hidden: false };
    const attributes = new Map([['aria-disabled', 'true']]);
    const cta = {
        getAttribute: name => attributes.get(name) ?? null,
        setAttribute: (name, value) => attributes.set(name, value),
        removeAttribute: name => attributes.delete(name),
    };
    const elements = {
        '[data-toys-launch]': announcement,
        '[data-toys-cta]': cta,
        '[data-toys-shop]': shopCopy,
        '[data-toys-arrow]': arrow,
        '[data-toys-time-note]': timeNote,
    };
    const document = {
        hidden: false,
        querySelector: selector => elements[selector] ?? null,
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
        announcement, cta, shopCopy, arrow, timeNote, document, listeners,
        get nextDelay() { return nextDelay; },
        setTime: at => { now = Date.parse(at); },
        tick: () => timer(),
    };
}

test('the arrival button becomes a shopping link at exactly 11 AM Central in every visitor time zone', () => {
    const page = visit('2026-10-30T11:59:59-04:00'); // Same instant as 10:59:59 CDT.
    assert.equal(page.announcement.hidden, false);
    assert.equal(page.shopCopy.hidden, true);
    assert.equal(page.arrow.hidden, true);
    assert.equal(page.timeNote.hidden, false);
    assert.equal(page.cta.getAttribute('href'), null);
    assert.equal(page.cta.getAttribute('aria-disabled'), 'true');
    assert.equal(page.nextDelay, 1000);
    page.setTime('2026-10-30T16:00:00Z');
    page.tick();
    assert.equal(page.announcement.hidden, true);
    assert.equal(page.shopCopy.hidden, false);
    assert.equal(page.arrow.hidden, false);
    assert.equal(page.timeNote.hidden, true);
    assert.equal(page.cta.getAttribute('href'), 'village');
    assert.equal(page.cta.getAttribute('aria-disabled'), null);
    assert.equal(page.nextDelay, undefined);
});

test('a page opened after release immediately has an active shopping link and arrow', () => {
    const page = visit('2026-11-01T12:00:00Z');
    assert.equal(page.announcement.hidden, true);
    assert.equal(page.shopCopy.hidden, false);
    assert.equal(page.arrow.hidden, false);
    assert.equal(page.timeNote.hidden, true);
    assert.equal(page.cta.getAttribute('href'), 'village');
    assert.equal(page.cta.getAttribute('aria-disabled'), null);
    assert.equal(page.nextDelay, undefined);
});

test('a backgrounded or restored page catches up after release', () => {
    for (const event of ['visibilitychange', 'pageshow', 'focus']) {
        const page = visit('2026-10-28T12:00:00Z');
        assert.equal(page.nextDelay, 60_000);
        page.setTime('2026-10-30T16:00:00Z');
        page.listeners[event]();
        assert.equal(page.announcement.hidden, true);
        assert.equal(page.shopCopy.hidden, false);
        assert.equal(page.arrow.hidden, false);
        assert.equal(page.timeNote.hidden, true);
        assert.equal(page.cta.getAttribute('href'), 'village');
        assert.equal(page.nextDelay, undefined);
    }
});
