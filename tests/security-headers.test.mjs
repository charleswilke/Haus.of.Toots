import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root), 'utf8');

const vercelConfig = JSON.parse(read('vercel.json'));
const siteWideHeaders = Object.fromEntries(
    (vercelConfig.headers.find(rule => rule.source === '/(.*)')?.headers || [])
        .map(({ key, value }) => [key, value])
);

function cspDirectives() {
    return Object.fromEntries(
        siteWideHeaders['Content-Security-Policy']
            .split(';')
            .map(directive => directive.trim().split(/\s+/))
            .map(([name, ...values]) => [name, values])
    );
}

test('every response carries the baseline security headers', () => {
    assert.equal(siteWideHeaders['X-Content-Type-Options'], 'nosniff');
    assert.equal(siteWideHeaders['X-Frame-Options'], 'DENY');
    assert.equal(siteWideHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.ok(siteWideHeaders['Permissions-Policy']);
    assert.ok(siteWideHeaders['Content-Security-Policy']);
});

test('the content security policy only runs scripts served by the site', () => {
    const csp = cspDirectives();
    assert.deepEqual(csp['script-src'], ["'self'"]);
    assert.deepEqual(csp['object-src'], ["'none'"]);
    assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
    assert.deepEqual(csp['base-uri'], ["'self'"]);
});

test('the policy allows the Shopify hosts the storefront depends on', () => {
    const csp = cspDirectives();
    const { domain } = new Function(`${read('shopify-config.js')}; return SHOPIFY_CONFIG;`)();
    assert.ok(csp['connect-src'].includes(`https://${domain}`));
    // Product photos come from Shopify's CDN.
    assert.ok(csp['img-src'].includes('https:'));
});

// script-src 'self' blocks inline scripts and inline event handlers in
// production, where they fail silently. Page code belongs in a .js file.
test('pages contain no inline scripts or inline event handlers', () => {
    const pages = readdirSync(root).filter(name => name.endsWith('.html'));
    assert.ok(pages.length > 0);

    for (const page of pages) {
        const html = read(page);
        for (const [tag, attributes] of html.matchAll(/<script\b([^>]*)>/gi)) {
            const isDataBlock = /type=["']application\/(ld\+)?json["']/i.test(attributes);
            assert.ok(/\bsrc=/.test(attributes) || isDataBlock, `${page} has an inline script: ${tag}`);
        }
        assert.doesNotMatch(html, /<[^>]+\son[a-z]+\s*=\s*["']/i, `${page} has an inline event handler`);
        assert.doesNotMatch(html, /href=["']\s*javascript:/i, `${page} has a javascript: link`);
    }
});

test('build tooling is not part of the published site', () => {
    const skipDirs = read('build.mjs').match(/const skipDirs = new Set\(\[([^\]]*)\]\)/)[1];
    assert.match(skipDirs, /'tools'/);
});
