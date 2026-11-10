// Build step for Vercel: copy the static site into dist/ with all root
// CSS/JS minified, then stamp every reference to a local file with a version
// taken from that file's contents. Source files stay readable in the repo and
// filenames are unchanged. The api/ serverless functions are deployed from the
// repo root and are not part of this output.
//
// Versions are written here, so any ?v= value typed by hand in the source is
// replaced and never needs bumping. vercel.json lets browsers keep a versioned
// file for a year, which is only safe because the version changes whenever the
// file does.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

// Finder drops .DS_Store files into image folders; keep them out of the deploy.
const copyOpts = { recursive: true, filter: src => !src.endsWith('.DS_Store') };

const skipDirs = new Set(['dist', 'api', 'docs', '_archived', 'node_modules', 'images', 'tests', 'tools']);
const skipFiles = new Set(['build.mjs', 'package.json', 'package-lock.json', 'vercel.json', 'HausOfToots.code-workspace']);
// Temporarily hidden pages: keep their source available for easy restoration.
const hiddenPages = new Set(['just-landed.html', 'gallery.html']);

// A relative images/ path as written in HTML attributes, srcset lists, CSS
// url() and JS strings. The character before it rules out absolute URLs such
// as the Open Graph image, which other sites fetch and must stay plain.
const IMAGE_REF = /(?<=^|["'`(\s,=])(images\/[A-Za-z0-9_./-]+)(\?v=[A-Za-z0-9_-]*)?/g;
// A root stylesheet or script referenced from a page.
const PAGE_ASSET_REF = /((?:href|src)=")([A-Za-z0-9_-]+\.(?:css|js))(\?[^"]*)?(")/g;

export function contentVersion(content) {
    return createHash('sha256').update(content).digest('hex').slice(0, 10);
}

/** Stamps each images/ path that names a known file; anything else is left alone. */
export function stampImageRefs(text, imageVersions) {
    return text.replace(IMAGE_REF, (match, path) => {
        const version = imageVersions.get(path);
        return version ? `${path}?v=${version}` : match;
    });
}

/** Stamps the stylesheets and scripts a page loads. */
export function stampPageAssets(html, assetVersions) {
    return html.replace(PAGE_ASSET_REF, (match, open, file, _query, close) => {
        const version = assetVersions.get(file);
        return version ? `${open}${file}?v=${version}${close}` : match;
    });
}

function listFiles(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? listFiles(path) : [path];
    });
}

export async function buildSite(outDir = join(root, 'dist')) {
    const dist = resolve(outDir);
    rmSync(dist, { recursive: true, force: true });
    mkdirSync(dist, { recursive: true });

    const minifyTargets = [];
    const pages = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        const name = entry.name;
        if (name.startsWith('.') || skipFiles.has(name) || hiddenPages.has(name) || name.endsWith('.md')) continue;
        if (entry.isDirectory()) {
            if (!skipDirs.has(name)) cpSync(join(root, name), join(dist, name), copyOpts);
            continue;
        }
        if (name.endsWith('.js') || name.endsWith('.css')) {
            minifyTargets.push(name);
        } else {
            copyFileSync(join(root, name), join(dist, name));
            if (name.endsWith('.html')) pages.push(name);
        }
    }
    cpSync(join(root, 'images'), join(dist, 'images'), copyOpts);

    await build({
        entryPoints: minifyTargets.map(name => join(root, name)),
        outbase: root,
        outdir: dist,
        minify: true,
        bundle: false,
        target: ['es2017'],
        legalComments: 'none',
    });

    const imageVersions = new Map(
        listFiles(join(dist, 'images')).map(path => [
            relative(dist, path).split(sep).join('/'),
            contentVersion(readFileSync(path)),
        ])
    );

    // Images are stamped into the stylesheets and scripts first, so a changed
    // image changes the files that point at it and their versions follow.
    const assetVersions = new Map();
    for (const name of minifyTargets) {
        const path = join(dist, name);
        const stamped = stampImageRefs(readFileSync(path, 'utf8'), imageVersions);
        writeFileSync(path, stamped);
        assetVersions.set(name, contentVersion(stamped));
    }

    for (const name of pages) {
        const path = join(dist, name);
        const html = stampPageAssets(stampImageRefs(readFileSync(path, 'utf8'), imageVersions), assetVersions);
        writeFileSync(path, html);
    }

    return { dist, pages, assets: minifyTargets, imageVersions, assetVersions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const { assets, pages } = await buildSite();
    console.log(`Built ${assets.length} minified assets and ${pages.length} pages into dist/`);
}
