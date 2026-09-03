#!/usr/bin/env node
// Emits the `geo` object for a city entry in LNS_SHOPS (hot-at-lns.html modal):
// a simplified state outline as an SVG path, normalized so the larger dimension
// is 100, plus the city's x/y in the same units.
//
//   curl -sL -o /tmp/us-states.json \
//     https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json
//   node tools/gen-lns-state-path.js /tmp/us-states.json Illinois 42.1558 -88.1398
//
// Projection matches the existing entries: plate carrée with x scaled by
// cos(mid-latitude). Only the largest ring is kept (drops islands), and
// consecutive points closer than MIN_STEP units are merged.
import fs from 'node:fs';
const [,, file, stateName, latS, lonS] = process.argv;
if (!lonS) { console.error('usage: gen-lns-state-path.js <us-states.json> <State Name> <lat> <lon>'); process.exit(1); }
const MIN_STEP = 1.2;

const gj = JSON.parse(fs.readFileSync(file, 'utf8'));
const f = gj.features.find(f => f.properties.name === stateName);
if (!f) { console.error('no state named ' + stateName); process.exit(1); }
const rings = f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map(p => p[0]);
rings.sort((a, b) => b.length - a.length);
const ring = rings[0];

const lats = ring.map(p => p[1]), lons = ring.map(p => p[0]);
const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
const cos = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
const rawW = (maxLon - minLon) * cos, rawH = maxLat - minLat;
const k = 100 / Math.max(rawW, rawH);
const px = ([lon, lat]) => [(lon - minLon) * cos * k, (maxLat - lat) * k];
const r1 = v => Math.round(v * 10) / 10;

const pts = ring.map(px);
const kept = [pts[0]];
for (const p of pts.slice(1)) {
  const q = kept[kept.length - 1];
  if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= MIN_STEP) kept.push(p);
}
const d = 'M' + kept.map(([x, y]) => r1(x).toFixed(1) + ' ' + r1(y).toFixed(1)).join('L') + 'Z';
const [cx, cy] = px([parseFloat(lonS), parseFloat(latS)]);
const lat = parseFloat(latS), lon = parseFloat(lonS);
const coords = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;

console.log(`geo: { d: '${d}', w: ${r1(rawW * k)}, h: ${r1(rawH * k)}, x: ${r1(cx)}, y: ${r1(cy)}, coords: '${coords}' }`);
console.error(`${stateName}: ${ring.length} ring points → ${kept.length} kept`);
