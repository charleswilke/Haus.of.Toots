import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../toys-r-us.js', import.meta.url), 'utf8');

function visit(random, small = true) {
    const classes = new Set();
    const label = { textContent: 'Gold Star Stitcher' };
    const card = {
        classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
        querySelector: () => label,
    };
    let onResize;
    const media = { matches: small, addEventListener: (_, fn) => { onResize = fn; } };
    const button = dataset => ({
        dataset, attributes: {}, handlers: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, fn) { this.handlers[name] = fn; },
    });
    const swap = button({});
    const choices = ['classic', 'holiday'].map(edition => button({ costcoEdition: edition }));
    const photos = ['classic', 'holiday'].map(edition => ({ dataset: { costcoPhoto: edition }, hidden: edition !== 'classic' }));
    const gallery = {
        querySelector: () => swap,
        querySelectorAll: selector => selector === '[data-costco-photo]' ? photos : choices,
    };
    let randomCalls = 0;
    vm.runInNewContext(source, {
        document: { querySelector: selector => ({
            '[data-costco-responsive-card]': card,
            '[data-costco-gallery]': gallery,
        })[selector] ?? null },
        window: { matchMedia: query => {
            assert.equal(query, '(max-width: 1099px)');
            return media;
        } },
        Math: { random: () => { randomCalls++; return random; } },
    });
    return {
        label, photos, choices, swap,
        get executive() { return classes.has('costco-membership-mobile-executive'); },
        get randomCalls() { return randomCalls; },
        resize(small) { media.matches = small; onResize(); },
    };
}

test('smaller screens can load either membership style', () => {
    const executive = visit(.1);
    assert.equal(executive.executive, true);
    assert.equal(executive.label.textContent, 'Executive Stitcher');
    const gold = visit(.9);
    assert.equal(gold.executive, false);
    assert.equal(gold.label.textContent, 'Gold Star Stitcher');
});

test('both styles retain independent edition selection and photo swapping', () => {
    for (const random of [.1, .9]) {
        const page = visit(random);
        const originalStyle = page.executive;
        page.choices[1].handlers.click();
        assert.deepEqual(page.photos.map(photo => photo.hidden), [true, false]);
        assert.equal(page.choices[1].attributes['aria-pressed'], 'true');
        assert.equal(page.swap.attributes['aria-label'], 'Show classic Costco canvas');
        page.swap.handlers.click();
        assert.deepEqual(page.photos.map(photo => photo.hidden), [false, true]);
        assert.equal(page.executive, originalStyle);
        assert.equal(page.randomCalls, 1);
    }
});

test('desktop always restores Gold Star and resizing back keeps the chosen style and edition', () => {
    for (const startSmall of [true, false]) {
        const page = visit(.1, startSmall);
        page.choices[1].handlers.click();
        page.resize(false);
        assert.equal(page.executive, false);
        assert.equal(page.label.textContent, 'Gold Star Stitcher');
        page.resize(true);
        assert.equal(page.executive, true);
        assert.equal(page.label.textContent, 'Executive Stitcher');
        assert.deepEqual(page.photos.map(photo => photo.hidden), [true, false]);
        assert.equal(page.randomCalls, 1);
    }
});


test('each Costco panel entry advances once, holds on exit, and stops at the zoom cap', () => {
    const handlers = {};
    const scales = [];
    const media = { matches: true };
    const feature = {
        style: { setProperty: (name, value) => scales.push([name, value]) },
        addEventListener: (name, fn) => { handlers[name] = fn; },
    };
    vm.runInNewContext(source, {
        document: { querySelector: selector => selector === '.costco-feature' ? feature : null },
        window: { matchMedia: () => media },
    });
    handlers.pointerenter();
    assert.deepEqual(scales, [['--costco-aisle-scale', '1.03']]);
    // No exit/child-hover listener resets the crop or advances it again.
    assert.deepEqual(Object.keys(handlers), ['pointerenter']);
    media.matches = false;
    handlers.pointerenter();
    assert.equal(scales.length, 1);
    media.matches = true;
    handlers.pointerenter();
    handlers.pointerenter();
    handlers.pointerenter();
    handlers.pointerenter();
    assert.deepEqual(scales.map(([, value]) => value), ['1.03', '1.06', '1.09', '1.12']);
});
