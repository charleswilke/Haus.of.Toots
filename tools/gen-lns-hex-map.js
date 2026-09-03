#!/usr/bin/env node
// Generates the HoT@LNS hex-tile map of the lower 48 as an inline SVG fragment.
// The output replaces the <svg class="lns-map">…</svg> block in hot-at-lns.html.
// To add a shop: append it to SHOPS (with lat/lon), add a label offset in LABELS
// if it's a new city, then: node tools/gen-lns-hex-map.js > /tmp/hex-map.svg
// and paste the result over the existing inline SVG (shop cards in the page
// are ordered alphabetically by shop name and are not generated here).

// --- Simplified lower-48 outline, (lon, lat), clockwise from NW Washington ---
const OUTLINE = [
  [-124.7, 48.4],   // NW Washington
  [-123.2, 49.0],   // WA/BC border
  [-95.15, 49.0],   // northern border ~49th parallel to Lake of the Woods
  [-94.6, 48.7],
  [-92.3, 46.8],    // Duluth dip
  [-90.8, 46.7],
  [-88.4, 48.2],    // over Lake Superior
  [-84.5, 46.5],    // Sault Ste. Marie
  [-82.5, 45.3],
  [-82.4, 43.0],    // Lake Huron shore
  [-83.1, 42.05],   // Detroit
  [-78.9, 42.9],    // Lake Erie
  [-79.05, 43.3],   // Niagara
  [-76.5, 43.65],   // Lake Ontario
  [-74.7, 45.0],    // St. Lawrence
  [-71.5, 45.05],   // VT/NH northern border
  [-70.9, 45.4],
  [-69.2, 47.45],   // top of Maine
  [-67.8, 47.05],
  [-67.05, 45.6],
  [-66.95, 44.8],   // downeast Maine
  [-68.7, 44.2],
  [-70.2, 43.5],    // southern Maine coast (Biddeford)
  [-70.7, 42.9],
  [-69.95, 41.9],   // Cape Cod
  [-71.4, 41.45],
  [-72.9, 41.2],    // CT shore
  [-73.95, 40.55],  // NYC
  [-74.1, 39.7],    // Jersey shore
  [-74.95, 38.93],  // Cape May
  [-75.05, 38.4],   // Delmarva
  [-75.9, 37.1],
  [-76.0, 36.5],    // Norfolk
  [-75.5, 35.2],    // Outer Banks
  [-76.7, 34.6],
  [-77.9, 33.9],    // Wilmington
  [-79.9, 32.75],   // Charleston
  [-81.1, 31.9],    // Savannah
  [-81.4, 30.4],    // Jacksonville
  [-80.2, 27.2],    // FL east coast
  [-80.1, 25.8],    // Miami
  [-81.1, 25.15],   // FL tip
  [-81.7, 25.9],
  [-82.7, 27.9],    // Tampa
  [-82.9, 29.1],
  [-83.7, 29.9],    // Big Bend
  [-85.3, 29.65],   // panhandle
  [-87.2, 30.3],    // Pensacola
  [-88.0, 30.2],    // Mobile
  [-89.2, 29.2],    // New Orleans
  [-90.2, 29.1],
  [-91.6, 29.55],
  [-93.8, 29.7],
  [-94.75, 29.35],  // Galveston
  [-97.2, 27.6],    // Corpus Christi
  [-97.15, 25.95],  // Brownsville
  [-99.1, 26.4],    // Rio Grande
  [-99.5, 27.5],    // Laredo
  [-100.9, 29.3],   // Del Rio
  [-102.3, 29.85],
  [-103.1, 28.98],  // Big Bend
  [-104.5, 29.6],
  [-106.5, 31.8],   // El Paso
  [-108.2, 31.75],
  [-108.2, 31.33],  // NM bootheel
  [-111.07, 31.33], // AZ border
  [-114.8, 32.5],   // Yuma
  [-117.1, 32.55],  // San Diego
  [-118.4, 33.75],  // LA
  [-120.6, 34.55],  // Point Conception
  [-121.9, 36.3],   // Big Sur
  [-122.5, 37.8],   // San Francisco
  [-124.0, 40.0],
  [-124.4, 40.45],  // Cape Mendocino
  [-124.5, 42.8],   // Oregon coast
  [-124.0, 46.2],
  [-124.7, 48.4],   // close
];

// --- Shops ---
const SHOPS = [
  { name: "Angel City Stitchery", url: "https://www.angelcitystitchery.com/", addr: "13347 Washington Blvd Ste B, Los Angeles, CA 90066", city: "Los Angeles", state: "CA", lat: 33.9926, lon: -118.4436 },
  { name: "Sunny Stitches", url: "http://www.sunnystitchesdenver.com/", addr: "1927 E Kentucky Ave, Denver, CO 80209", city: "Denver", state: "CO", lat: 39.692, lon: -104.973 },
  { name: "The Needle Works", url: "http://theneedleworks.com/", addr: "4401 Medical Pkwy, Austin, TX 78756", city: "Austin", state: "TX", lat: 30.3078, lon: -97.7387 },
  { name: "Mimi's Needlepoint", url: "https://mimisneedlepoint.com/", addr: "803 W Davis St Ste 103, Dallas, TX 75208", city: "Dallas", state: "TX", lat: 32.7473, lon: -96.828 },
  { name: "Barbara's Needlepoint", url: "http://www.barbarasneedlepoint.com/", addr: "1708 S Western Ave Unit 1, Sioux Falls, SD 57105", city: "Sioux Falls", state: "SD", lat: 43.525, lon: -96.744 },
  { name: "Village Needleworks", url: "http://www.villageneedleworks.com/", addr: "8721 Shamrock Rd, Omaha, NE 68114", city: "Omaha", state: "NE", lat: 41.256, lon: -96.05 },
  { name: "KC Needlepoint", url: "http://www.kcneedlepoint.com/", addr: "8050 Wornall Rd, Kansas City, MO 64114", city: "Kansas City", state: "MO", lat: 38.984, lon: -94.594 },
  { name: "The Pepper Pot", url: "https://thepepperpot.co/", addr: "Icehouse Mall, 200 Applebee St, Barrington, IL 60010", city: "Barrington", state: "IL", lat: 42.1558, lon: -88.1398 },
  { name: "Kick Ass Needlepoint", url: "https://www.kickassneedlepoint.com/", addr: "850 Hillwood Blvd #6, Nashville, TN 37209", city: "Nashville", state: "TN", lat: 36.131, lon: -86.858 },
  { name: "The Nimble Needle", url: "https://www.atlantanimbleneedle.com/", addr: "206B Johnson Ferry Rd, Atlanta, GA 30328", city: "Atlanta", state: "GA", lat: 33.926, lon: -84.382 },
  { name: "Honeysuckle Needlepoint", url: null, addr: "102 Hill St, Bridgeport, WV 26330", city: "Bridgeport", state: "WV", lat: 39.2865, lon: -80.256 },
  { name: "Mrs. Meshugga Needlepoint Shop", url: "https://mrsmeshugga.com/", addr: "1875 Springfield Ave, Maplewood, NJ 07040", city: "Maplewood", state: "NJ", lat: 40.729, lon: -74.2735 },
];

// --- Projection: plate carrée scaled by cos(38.5°) on x ---
const COSLAT = Math.cos((38.5 * Math.PI) / 180);
const LON0 = -125.5, LAT0 = 49.8;
const SCALE = 22; // px per degree of latitude
// right/bottom sit tighter than left/top: content is sparse near those
// edges (east-coast labels, gulf tip), so equal padding reads loose
const PAD = { left: 30, top: 26, right: 51, bottom: 12 };
function project(lon, lat) {
  return {
    x: PAD.left + (lon - LON0) * COSLAT * SCALE,
    y: PAD.top + (LAT0 - lat) * SCALE,
  };
}

const outlinePx = OUTLINE.map(([lon, lat]) => project(lon, lat));

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// --- Hex grid (pointy-top) ---
const R = 12;
const COL_W = Math.sqrt(3) * R;
const ROW_H = 1.5 * R;
const maxX = Math.max(...outlinePx.map(p => p.x));
const maxY = Math.max(...outlinePx.map(p => p.y));

const hexes = [];
for (let row = 0; row * ROW_H < maxY + R; row++) {
  const cy = PAD.top / 2 + row * ROW_H;
  const xOff = row % 2 === 1 ? COL_W / 2 : 0;
  for (let col = 0; col * COL_W < maxX + R; col++) {
    const cx = PAD.left / 2 + xOff + col * COL_W;
    if (pointInPolygon(cx, cy, outlinePx)) hexes.push({ cx, cy, row, col });
  }
}

// deterministic shade per hex
function shade(row, col) {
  let h = (row * 73856093) ^ (col * 19349663);
  h = Math.abs(h) % 100;
  if (h < 46) return 1; // linen
  if (h < 72) return 2; // blush
  if (h < 90) return 3; // cream
  return 4;             // soft coral fleck
}

// --- Snap each city (grouped) to nearest hex ---
const cities = [];
for (const s of SHOPS) {
  let c = cities.find(c => c.city === s.city && c.state === s.state);
  if (!c) {
    c = { city: s.city, state: s.state, lat: s.lat, lon: s.lon, shops: [] };
    cities.push(c);
  }
  c.shops.push(s);
}

const usedHexes = new Set();
for (const c of cities) {
  const p = project(c.lon, c.lat);
  let best = null, bestD = Infinity;
  for (const h of hexes) {
    const key = h.row + "," + h.col;
    if (usedHexes.has(key)) continue;
    const d = (h.cx - p.x) ** 2 + (h.cy - p.y) ** 2;
    if (d < bestD) { bestD = d; best = h; }
  }
  best.marker = true;
  usedHexes.add(best.row + "," + best.col);
  c.hx = best.cx;
  c.hy = best.cy;
}

// stable output order (west → east)
cities.sort((a, b) => a.lon - b.lon);

// --- Label placement (dx, dy relative to marker, anchor) ---
const LABELS = {
  "Los Angeles": { dx: 20,  dy: 4,   anchor: "start" },
  "Denver":      { dx: 0,   dy: -20, anchor: "middle" },
  "Austin":      { dx: 4,   dy: 26,  anchor: "middle" },
  "Dallas":      { dx: 20,  dy: 4,   anchor: "start" },
  "Sioux Falls": { dx: 2,   dy: -20, anchor: "middle" },
  "Omaha":       { dx: 21,  dy: -8,  anchor: "start" },
  "Kansas City": { dx: 21,  dy: 12,  anchor: "start" },
  "Barrington":  { dx: 2,   dy: -20, anchor: "middle" },
  "Nashville":   { dx: 2,   dy: 27,  anchor: "middle" },
  "Atlanta":     { dx: 20,  dy: 8,   anchor: "start" },
  "Bridgeport":  { dx: 2,   dy: -20, anchor: "middle" },
  "Maplewood":   { dx: 20,  dy: -6,  anchor: "start" },
};

// --- Emit SVG ---
const W = Math.ceil(maxX + PAD.right);
const H = Math.ceil(maxY + PAD.bottom);

function hexPoints(r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push((r * Math.cos(a)).toFixed(2) + "," + (r * Math.sin(a)).toFixed(2));
  }
  return pts.join(" ");
}

let svg = `<svg class="lns-map" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="lnsMapTitle">
  <title id="lnsMapTitle">Hex-tile map of the lower 48 United States showing local needlepoint shops that carry Haus of Toots canvases</title>
  <defs>
    <polygon id="lnsHex" points="${hexPoints(R * 0.86)}"/>
    <polygon id="lnsHexBig" points="${hexPoints(R * 1.2)}"/>
    <path id="lnsHeart" d="M0,4.89 C-4.46,1.49 -5.95,-1.28 -4.25,-3.19 C-2.76,-4.76 -0.85,-4.17 0,-2.55 C0.85,-4.17 2.76,-4.76 4.25,-3.19 C5.95,-1.28 4.46,1.49 0,4.89 Z"/>
  </defs>
  <g class="lns-tiles">
`;

for (const h of hexes) {
  if (h.marker) continue;
  svg += `    <use href="#lnsHex" x="${h.cx.toFixed(1)}" y="${h.cy.toFixed(1)}" class="hx hx${shade(h.row, h.col)}"/>\n`;
}
svg += `  </g>\n  <g class="lns-markers">\n`;

for (const c of cities) {
  const lb = LABELS[c.city];
  const shopNames = c.shops.map(s => s.name).join(" & ");
  const slug = c.city.toLowerCase().replace(/\s+/g, "-");
  svg += `    <a href="#stop-${slug}" class="lns-marker" aria-label="${c.city}, ${c.state}: ${shopNames}">
      <use href="#lnsHexBig" x="${c.hx.toFixed(1)}" y="${c.hy.toFixed(1)}" class="hx-marker"/>
      <use href="#lnsHeart" x="${c.hx.toFixed(1)}" y="${c.hy.toFixed(1)}" class="lns-marker-heart"/>
      <text x="${(c.hx + lb.dx).toFixed(1)}" y="${(c.hy + lb.dy + 4).toFixed(1)}" text-anchor="${lb.anchor}" class="lns-marker-label">${c.city}, ${c.state}</text>
    </a>\n`;
}
svg += `  </g>\n</svg>`;

process.stdout.write(svg);

// city manifest for the cards, to stderr for reference
console.error(JSON.stringify(cities.map(c => ({ city: c.city, state: c.state, shops: c.shops.map(s => s.name) })), null, 1));
console.error(`hexes: ${hexes.length}, svg: ${W}x${H}`);
