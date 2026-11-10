import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildSite, contentVersion, stampImageRefs, stampPageAssets } from '../build.mjs';

// Browsers keep a versioned file for a year (see vercel.json), so a reference
// the build fails to stamp, or stamps with the wrong version, would leave
// shoppers on a stale file. These tests hold the build to that.

const images = new Map([
    ['images/flash.webp', 'aaaaaaaaaa'],
    ['images/fonts/chewy-latin.woff2', 'bbbbbbbbbb'],
    ['images/lns/pepper-pot.webp', 'cccccccccc'],
]);

test('image references are stamped in every form the site writes them', () => {
    assert.equal(
        stampImageRefs('<img src="images/flash.webp" srcset="images/flash.webp 400w, images/flash.webp 720w">', images),
        '<img src="images/flash.webp?v=aaaaaaaaaa" srcset="images/flash.webp?v=aaaaaaaaaa 400w, images/flash.webp?v=aaaaaaaaaa 720w">'
    );
    assert.equal(
        stampImageRefs("src:url(images/fonts/chewy-latin.woff2) format('woff2')", images),
        "src:url(images/fonts/chewy-latin.woff2?v=bbbbbbbbbb) format('woff2')"
    );
    assert.equal(
        stampImageRefs("{logo:'images/lns/pepper-pot.webp'}", images),
        "{logo:'images/lns/pepper-pot.webp?v=cccccccccc'}"
    );
});

test('a version typed by hand is replaced, not appended to', () => {
    assert.equal(
        stampImageRefs('fetch("images/flash.webp?v=20260830b")', images),
        'fetch("images/flash.webp?v=aaaaaaaaaa")'
    );
    assert.equal(
        stampPageAssets('<script src="shop-app.js?v=20261109a" defer></script>', new Map([['shop-app.js', 'dddddddddd']])),
        '<script src="shop-app.js?v=dddddddddd" defer></script>'
    );
});

test('absolute, unknown and third-party references are left alone', () => {
    for (const untouched of [
        '<meta property="og:image" content="https://hausoftoots.com/images/flash.webp">',
        '<img src="images/not-a-real-file.webp">',
        '<img src="https://cdn.shopify.com/s/files/1/images/flash.webp">',
    ]) {
        assert.equal(stampImageRefs(untouched, images), untouched);
    }
    const external = '<script src="https://example.com/shop-app.js"></script><link href="unknown.css">';
    assert.equal(stampPageAssets(external, new Map([['shop-app.js', 'dddddddddd']])), external);
});

test('the built site references every local file by its content version', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'hot-build-'));
    try {
        const { pages, assets } = await buildSite(dist);
        assert.ok(pages.includes('index.html'));
        assert.ok(!pages.includes('gallery.html'), 'hidden pages are not published');
        assert.ok(!existsSync(join(dist, 'tools')), 'build tooling is not published');

        const versionOf = file => contentVersion(readFileSync(join(dist, file)));

        for (const page of pages) {
            const html = readFileSync(join(dist, page), 'utf8');
            const loaded = [...html.matchAll(/(?:href|src)="([A-Za-z0-9_-]+\.(?:css|js))(?:\?v=([a-z0-9]*))?"/g)];
            assert.ok(loaded.length > 0, `${page} loads no stylesheets or scripts`);
            for (const [, file, version] of loaded) {
                assert.equal(version, versionOf(file), `${page} → ${file}`);
            }
        }

        const textFiles = [...pages, ...assets];
        let imageRefs = 0;
        for (const name of textFiles) {
            const text = readFileSync(join(dist, name), 'utf8');
            for (const [, path, version] of text.matchAll(/(?<=^|["'`(\s,=])(images\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)(?:\?v=([a-z0-9]*))?/g)) {
                assert.ok(existsSync(join(dist, path)), `${name} references a missing file: ${path}`);
                assert.equal(version, versionOf(path), `${name} → ${path}`);
                imageRefs++;
            }
        }
        assert.ok(imageRefs > 100, 'expected the site to reference well over a hundred images');

        // The address other sites fetch for link previews stays plain.
        assert.match(readFileSync(join(dist, 'index.html'), 'utf8'), /content="https:\/\/hausoftoots\.com\/images\/og-image-v3\.png"/);
        assert.deepEqual(readdirSync(dist).filter(name => name.endsWith('.mjs') || name.endsWith('.json')), []);
    } finally {
        rmSync(dist, { recursive: true, force: true });
    }
});

test('only versioned files are cached for a year', () => {
    const { headers } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    const cacheRules = headers.filter(rule => rule.headers.some(header => header.key === 'Cache-Control'));
    const cacheControl = rule => rule.headers.find(header => header.key === 'Cache-Control').value;

    for (const source of ['/images/(.*)', '/(.*)\\.(css|js)']) {
        const [versioned, unversioned] = cacheRules.filter(rule => rule.source === source);
        assert.deepEqual(versioned.has, [{ type: 'query', key: 'v' }]);
        assert.match(cacheControl(versioned), /max-age=31536000, immutable/);

        assert.deepEqual(unversioned.missing, [{ type: 'query', key: 'v' }]);
        assert.doesNotMatch(cacheControl(unversioned), /immutable/);
        assert.match(cacheControl(unversioned), /max-age=86400\b/);
    }
});
