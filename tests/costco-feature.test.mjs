import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../toys-r-us.js', import.meta.url), 'utf8');

function visit(random, small = true, { saveData = false } = {}) {
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
    const photos = ['classic', 'holiday'].map(edition => {
        const image = {
            loading: edition === 'classic' ? 'eager' : 'lazy',
            setAttribute(name, value) { this[name] = value; },
        };
        return { dataset: { costcoPhoto: edition }, hidden: edition !== 'classic', image, querySelector: () => image };
    });
    const gallery = {
        querySelector: () => swap,
        querySelectorAll: selector => selector === '[data-costco-photo]' ? photos : choices,
    };
    let randomCalls = 0;
    const windowHandlers = {};
    const idleCallbacks = [];
    vm.runInNewContext(source, {
        document: { readyState: 'interactive', querySelector: selector => ({
            '[data-costco-responsive-card]': card,
            '[data-costco-gallery]': gallery,
        })[selector] ?? null },
        window: {
            matchMedia: query => {
                assert.equal(query, '(max-width: 1099px)');
                return media;
            },
            navigator: { connection: { saveData } },
            addEventListener: (name, fn) => { windowHandlers[name] = fn; },
            requestIdleCallback: fn => { idleCallbacks.push(fn); },
        },
        Math: { random: () => { randomCalls++; return random; } },
    });
    return {
        label, photos, choices, swap,
        get hiddenPhotoLoading() { return photos[1].image.loading; },
        get waitsForLoad() { return typeof windowHandlers.load === 'function'; },
        finishLoading() { windowHandlers.load(); },
        goIdle() { idleCallbacks.splice(0).forEach(fn => fn()); },
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

test('the hidden edition photo stays out of the first load and is fetched once the page settles', () => {
    const page = visit(.9);
    assert.equal(page.hiddenPhotoLoading, 'lazy');
    page.finishLoading();
    assert.equal(page.hiddenPhotoLoading, 'lazy');
    page.goIdle();
    assert.equal(page.hiddenPhotoLoading, 'eager');
});

test('shoppers saving data only fetch the hidden edition photo when they ask for it', () => {
    const page = visit(.9, true, { saveData: true });
    assert.equal(page.waitsForLoad, false);
    assert.equal(page.hiddenPhotoLoading, 'lazy');
    page.choices[1].handlers.click();
    assert.equal(page.hiddenPhotoLoading, 'eager');
    assert.deepEqual(page.photos.map(photo => photo.hidden), [true, false]);
});

test('swapping before the page settles fetches the hidden edition photo straight away', () => {
    const page = visit(.9);
    page.swap.handlers.click();
    assert.equal(page.hiddenPhotoLoading, 'eager');
});

test('Costco photos are marked up so a screen only fetches the ones it shows', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const feature = html.slice(html.indexOf('<article class="costco-feature"'), html.indexOf('costco-feature-footer'));
    const tags = [...feature.matchAll(/<(img|source)\b[^>]*costco-(classic|holiday)-13[^>]*>/g)]
        .map(([tag, element, edition]) => ({ tag, element, edition, sizes: tag.match(/sizes="([^"]*)"/)[1] }));
    assert.equal(tags.length, 4);

    // Images sharing one srcset and sizes always resolve to the same file, so
    // the copy hidden by the layout never costs a second download.
    const responsive = '(max-width: 700px) calc(190vw - 190px), (max-width: 1099px) 76vw, 460px';
    const classic = tags.filter(({ edition }) => edition === 'classic');
    assert.deepEqual(classic.map(({ element, sizes }) => [element, sizes]), [['img', responsive], ['img', responsive]]);
    assert.ok(classic.every(({ tag }) => !/loading="lazy"/.test(tag)), 'the classic photo is the hero image and must load eagerly');

    const [galleryHoliday, desktopHoliday] = tags.filter(({ edition }) => edition === 'holiday');
    assert.equal(galleryHoliday.element, 'img');
    assert.equal(galleryHoliday.sizes, responsive);
    assert.match(galleryHoliday.tag, /loading="lazy"/);

    assert.equal(desktopHoliday.element, 'source');
    assert.match(desktopHoliday.tag, /media="\(min-width: 1100px\)"/);
    assert.match(feature, /<picture>\s*<source[^>]*costco-holiday-13[^>]*>\s*<img src="data:image\/gif;base64,[^"]+"/);
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
