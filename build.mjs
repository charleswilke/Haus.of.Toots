// Build step for Vercel: copy the static site into dist/ with all root
// CSS/JS minified. Source files stay readable in the repo; filenames are
// unchanged so the ?v= cache-busting in the HTML keeps working. The api/
// serverless functions are deployed from the repo root and are not part
// of this output.
import { build } from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';

// Finder drops .DS_Store files into image folders; keep them out of the deploy.
const copyOpts = { recursive: true, filter: src => !src.endsWith('.DS_Store') };

const dist = 'dist';
const skipDirs = new Set(['dist', 'api', 'docs', '_archived', 'node_modules', 'images']);
const skipFiles = new Set(['build.mjs', 'package.json', 'package-lock.json', 'vercel.json', 'HausOfToots.code-workspace']);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);

const minifyTargets = [];
for (const entry of readdirSync('.', { withFileTypes: true })) {
    const name = entry.name;
    if (name.startsWith('.') || skipFiles.has(name) || name.endsWith('.md')) continue;
    if (entry.isDirectory()) {
        if (!skipDirs.has(name)) cpSync(name, `${dist}/${name}`, copyOpts);
        continue;
    }
    if (name.endsWith('.js') || name.endsWith('.css')) {
        minifyTargets.push(name);
    } else {
        copyFileSync(name, `${dist}/${name}`);
    }
}
cpSync('images', `${dist}/images`, copyOpts);

await build({
    entryPoints: minifyTargets,
    outdir: dist,
    minify: true,
    bundle: false,
    target: ['es2017'],
    legalComments: 'none',
});

console.log(`Built ${minifyTargets.length} minified assets into ${dist}/`);
