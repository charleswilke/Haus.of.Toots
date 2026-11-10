import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

// The notice's markup ships in index.html and a deferred script decides
// whether it applies. Unless the markup starts hidden, an expired notice is
// on screen until that script has downloaded and run.

function loadNotice(search = '') {
    const source = read('shared-components.js');
    const start = source.indexOf('const ShippingNotice = {');
    const end = source.indexOf('\n};\n', start) + '\n};\n'.length;
    return new Function('location', 'URLSearchParams', `${source.slice(start, end)}\nreturn ShippingNotice;`)(
        { search }, URLSearchParams
    );
}

function homepage() {
    const text = { textContent: '', innerHTML: '' };
    const section = {
        hidden: true,
        removed: false,
        dataset: {},
        querySelector: () => text,
        remove() { this.removed = true; },
    };
    return section;
}

function applyOn(notice, date) {
    const section = homepage();
    const RealDate = Date;
    globalThis.document = { getElementById: () => section };
    globalThis.Date = class extends RealDate {
        constructor(...args) { super(...(args.length ? args : [date.getTime()])); }
    };
    try {
        notice.applyHomepage();
    } finally {
        globalThis.Date = RealDate;
        delete globalThis.document;
    }
    return section;
}

test('the homepage shipping notice starts hidden in the page markup', () => {
    assert.match(read('index.html'), /<section class="shipping-notice-section" id="shippingNotice" hidden>/);
});

test('a current notice is revealed and an expired one is removed', () => {
    const notice = loadNotice();

    const before = applyOn(notice, new Date(2026, 10, 10, 23, 59, 59));
    assert.equal(before.hidden, false);
    assert.equal(before.dataset.phase, 'before');

    const away = applyOn(notice, new Date(2026, 10, 11, 0, 0, 0));
    assert.equal(away.hidden, false);
    assert.equal(away.dataset.phase, 'away');

    const expired = applyOn(notice, new Date(2026, 10, 16, 0, 0, 0));
    assert.equal(expired.removed, true);
    assert.equal(expired.hidden, true);
});

test('the preview link still shows an expired notice', () => {
    const previewed = applyOn(loadNotice('?notice=before'), new Date(2030, 0, 1));
    assert.equal(previewed.hidden, false);
    assert.equal(previewed.removed, false);
});
