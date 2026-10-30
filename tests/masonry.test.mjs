import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../shared-components.js', import.meta.url), 'utf8');
const helper = source.slice(source.indexOf('window.applyMasonry ='), source.indexOf('let __masonryResizeTimer'));

function layout(heights, width) {
    const makeElement = (height = 0) => ({
        children: [], dataset: {}, style: {}, className: '',
        classList: { contains(name) { return name === 'masonry-column' && height === 0; } },
        get offsetHeight() {
            return height || this.children.reduce((sum, child) => sum + child.offsetHeight + 32, 0);
        },
        appendChild(child) { this.children.push(child); },
        set innerHTML(value) { this.children = []; },
        querySelectorAll(selector) {
            return selector === 'img' ? [] : this.children.filter(child => child.className === 'masonry-column');
        }
    });
    const grid = makeElement();
    grid.offsetWidth = width;
    heights.forEach((height, index) => {
        const card = makeElement(height);
        card.id = index;
        grid.appendChild(card);
    });
    const context = { window: {}, document: { createElement: () => makeElement() } };
    vm.runInNewContext(helper, context);
    context.window.applyMasonry(grid);
    return grid.children.map(column => column.children.map(card => card.id));
}

test('incomplete masonry rows fill from the left despite shorter columns on the right', () => {
    const heights = [280, 260, 280, 260, 260, 260, 260, 260, 280, 260];
    assert.deepEqual(layout(heights, 1200), [[0, 6, 8], [1, 4, 9], [2, 7], [3, 5]]);
    assert.deepEqual(layout(heights.slice(0, 9), 1200), [[0, 6, 8], [1, 4], [2, 7], [3, 5]]);
});

test('complete masonry rows still pack into the shortest columns', () => {
    assert.deepEqual(layout([280, 260, 280, 260, 260, 260, 260, 260], 1200),
        [[0, 6], [1, 4], [2, 7], [3, 5]]);
});

test('left-first final rows adapt to three, two, and single column layouts', () => {
    assert.deepEqual(layout([280, 260, 280, 260, 260], 1000), [[0, 3], [1, 4], [2]]);
    assert.deepEqual(layout([280, 260, 280], 800), [[0, 2], [1]]);
    assert.deepEqual(layout([280, 260, 280], 500), [[0, 1, 2]]);
    assert.deepEqual(layout([280, 260], 1200), [[0], [1]]);
});
