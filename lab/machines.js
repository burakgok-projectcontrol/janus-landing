// Construction machines built from primitives, for machines no free model exists for.
// Convention: machine faces +x, y is up, z is width, ground at y = 0, sizes in metres.
// Every mesh keeps two materials (userData.orig / userData.maq) so the scene can switch looks.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

export function createMachines(orig, maq) {
  const spinners = [];

  function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, maq[mat]);
    m.userData.orig = orig[mat];
    m.userData.maq = maq[mat];
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  }
  const group = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };

  const rbox = (w, h, d, r = 0.07) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * 0.98);
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cylY = (r, l, n = 16) => new THREE.CylinderGeometry(r, r, l, n);
  const cylX = (r, l, n = 16) => cylY(r, l, n).rotateZ(Math.PI / 2);
  const cylZ = (r, l, n = 16) => cylY(r, l, n).rotateX(Math.PI / 2);

  // A cylinder between two points (struts, rails, pipes).
  function link(parent, a, b, r, mat, n = 10) {
    const d = b.clone().sub(a);
    const m = add(parent, cylY(r, d.length(), n), mat);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  }
  // Hydraulic ram: thick barrel near a, thin chrome rod to b.
  function ram(parent, a, b, r = 0.07) {
    const mid = a.clone().lerp(b, 0.55);
    link(parent, a, mid, r, 'body');
    link(parent, mid.clone().lerp(a, 0.1), b, r * 0.5, 'steel');
  }

  // Tyre with rounded shoulders, chevron lugs, rim, hub and bolts. Axis along z; spins about z.
  function tyre(parent, x, y, z, r, w, spin = 0) {
    const outer = group(parent, x, y, z);
    const t = group(outer);
    t.rotation.x = Math.PI / 2;
    const prof = [
      [r * 0.6, -w / 2], [r * 0.88, -w / 2], [r * 0.97, -w * 0.38], [r, -w * 0.2],
      [r, w * 0.2], [r * 0.97, w * 0.38], [r * 0.88, w / 2], [r * 0.6, w / 2],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    add(t, new THREE.LatheGeometry(prof, 28), 'dark');
    const n = Math.max(14, Math.round(r * 26));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const side = i % 2 ? 1 : -1;
      const lug = add(t, box(r * 0.07, w * 0.42, r * 0.16), 'dark', Math.cos(a) * r, side * w * 0.2, Math.sin(a) * r);
      lug.rotation.y = -a;
      lug.rotation.x = side * 0.35;
    }
    add(t, cylY(r * 0.6, w * 0.84, 24), 'steel');
    for (const s of [1, -1]) {
      add(t, cylY(r * 0.22, 0.06, 16), 'dark', 0, s * w * 0.44, 0);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        add(t, cylY(0.025, 0.05, 6), 'steel', Math.cos(a) * r * 0.36, s * w * 0.44, Math.sin(a) * r * 0.36);
      }
    }
    if (spin) spinners.push({ obj: outer, axis: 'z', speed: spin });
    return outer;
  }

  // Operator cab: solid lower body, glazed upper body with corner posts, roof, beacon and mirrors.
  function cab(parent, x, y, z, w, h, d) {
    const g = group(parent, x, y, z);
    const lower = h * 0.38;
    add(g, rbox(w, lower, d, 0.06), 'body', 0, lower / 2, 0);
    const gh = h - lower - 0.1;
    add(g, box(w - 0.12, gh, d - 0.12), 'glass', 0, lower + gh / 2, 0);
    for (const [px, pz] of [[w / 2, d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [-w / 2, -d / 2]]) {
      add(g, rbox(0.09, gh, 0.09, 0.03), 'body', px - Math.sign(px) * 0.045, lower + gh / 2, pz - Math.sign(pz) * 0.045);
    }
    add(g, rbox(w + 0.14, 0.12, d + 0.14, 0.05), 'body', 0, h - 0.04, 0);
    add(g, cylY(0.07, 0.12, 12), 'light', -w * 0.3, h + 0.08, d * 0.3);
    for (const s of [1, -1]) {
      link(g, V(w / 2, h * 0.75, s * d / 2), V(w / 2 + 0.15, h * 0.75, s * (d / 2 + 0.2)), 0.015, 'dark');
      add(g, rbox(0.04, 0.22, 0.14, 0.02), 'dark', w / 2 + 0.15, h * 0.75, s * (d / 2 + 0.24));
    }
    add(g, box(0.02, 0.03, 0.12), 'steel', w * 0.1, lower * 0.75, d / 2 + 0.01);
    return g;
  }

  function railing(parent, a, b, h = 0.7) {
    const n = Math.max(2, Math.round(a.distanceTo(b) / 0.6) + 1);
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, i / (n - 1));
      link(parent, p, p.clone().add(V(0, h, 0)), 0.02, 'steel', 6);
    }
    link(parent, a.clone().add(V(0, h, 0)), b.clone().add(V(0, h, 0)), 0.025, 'steel', 6);
    link(parent, a.clone().add(V(0, h / 2, 0)), b.clone().add(V(0, h / 2, 0)), 0.018, 'steel', 6);
  }

  function ladder(parent, x, y0, z, h, facing = 'z') {
    const off = facing === 'z' ? V(0.2, 0, 0) : V(0, 0, 0.2);
    for (const s of [1, -1]) link(parent, V(x, y0, z).addScaledVector(off, s), V(x, y0 + h, z).addScaledVector(off, s), 0.02, 'steel', 6);
    for (let y = y0 + 0.25; y < y0 + h; y += 0.28) link(parent, V(x, y, z).addScaledVector(off, 1), V(x, y, z).addScaledVector(off, -1), 0.015, 'steel', 6);
  }

  function exhaust(parent, x, y, z, h) {
    add(parent, cylY(0.07, h, 12), 'dark', x, y + h / 2, z);
    add(parent, cylY(0.09, 0.08, 12), 'steel', x, y + h, z, 0, 0, 0.3);
  }

  // Horizontal grille slats on a face whose normal is ±x.
  function grille(parent, x, y, z, height, depth, n = 6) {
    for (let i = 0; i < n; i++) add(parent, box(0.03, height / (n * 2), depth), 'dark', x, y - height / 2 + (i + 0.5) * (height / n), z);
  }

  // ---------------------------------------------------------------- road roller
  function roller() {
    const g = new THREE.Group();
    // Front drum with yoke, scraper bar and end plates.
    const drum = group(g, 1.95, 0.78, 0);
    add(drum, cylZ(0.78, 2.1, 36), 'steel');
    for (const s of [1, -1]) add(drum, cylZ(0.55, 0.04, 28), 'dark', 0, 0, s * 1.07);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(drum, box(0.05, 0.05, 2.12), 'dark', Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0);
    }
    spinners.push({ obj: drum, axis: 'z', speed: -1.2 });
    for (const s of [1, -1]) add(g, rbox(1.9, 1.05, 0.12), 'body', 1.95, 1.0, s * 1.18);
    add(g, rbox(2.0, 0.4, 2.5), 'body', 1.95, 1.72, 0);
    add(g, rbox(0.12, 0.12, 2.2, 0.04), 'dark', 2.85, 0.6, 0);
    add(g, rbox(0.15, 0.25, 2.3, 0.05), 'steel', 2.95, 1.55, 0);
    for (const s of [1, -1]) add(g, cylX(0.07, 0.06, 12), 'light', 2.98, 1.75, s * 0.9);
    // Articulation joint.
    add(g, rbox(0.6, 0.55, 0.9), 'dark', 0.75, 1.05, 0);
    add(g, cylY(0.12, 0.7, 12), 'steel', 0.75, 1.05, 0);
    // Rear chassis, engine hood, grille, fenders, tyres.
    add(g, rbox(2.6, 0.9, 1.4), 'body', -0.9, 1.15, 0);
    add(g, rbox(1.9, 0.75, 1.75, 0.12), 'body', -1.45, 1.95, 0);
    grille(g, -2.41, 1.95, 0, 0.5, 1.3, 7);
    for (const s of [1, -1]) {
      tyre(g, -1.0, 0.72, s * 1.02, 0.72, 0.6, -1.2);
      add(g, rbox(1.7, 0.07, 0.7, 0.03), 'body', -1.0, 1.55, s * 1.02);
      add(g, cylX(0.06, 0.05, 10), 'light', -2.43, 1.35, s * 0.6);
    }
    exhaust(g, -1.9, 2.3, 0.55, 0.75);
    // Platform, cab, steps.
    add(g, rbox(1.5, 0.12, 1.9), 'dark', 0.05, 1.62, 0);
    cab(g, 0.05, 1.68, 0, 1.35, 1.55, 1.55);
    ladder(g, 0.3, 0.25, 0.98, 1.35, 'z');
    return g;
  }

  // ---------------------------------------------------------------- motor grader
  function grader() {
    const g = new THREE.Group();
    // Front axle, push plate, gooseneck frame.
    for (const s of [1, -1]) tyre(g, 3.7, 0.65, s * 1.0, 0.65, 0.45, -1.4);
    add(g, rbox(0.3, 0.3, 1.6), 'dark', 3.7, 0.65, 0);
    add(g, rbox(0.25, 0.55, 2.3), 'body', 4.45, 0.75, 0);
    for (const s of [1, -1]) add(g, cylX(0.07, 0.05, 10), 'light', 4.6, 0.95, s * 0.8);
    add(g, rbox(0.55, 1.0, 0.55), 'body', 3.95, 1.15, 0);
    add(g, rbox(3.8, 0.5, 0.55), 'body', 2.05, 1.65, 0, 0, 0, 0.02);
    // Drawbar, circle and curved moldboard with lift rams.
    link(g, V(3.7, 1.1, 0), V(1.4, 0.95, 0), 0.09, 'dark');
    const circle = add(g, new THREE.TorusGeometry(0.85, 0.07, 8, 32), 'steel', 1.2, 0.95, 0, Math.PI / 2);
    circle.scale.set(1, 1, 1);
    // Moldboard: an arc profile (concave to the front) extruded across the width.
    const blade = group(g, 1.05, 0.55, 0);
    blade.rotation.y = 0.45;
    const R = 0.6;
    const mold = new THREE.CylinderGeometry(R, R, 3.6, 18, 1, true, Math.PI * 1.25, Math.PI * 0.5).rotateX(Math.PI / 2).translate(R, 0, 0);
    add(blade, mold, 'body');
    add(blade, box(0.08, 0.07, 3.6), 'steel', 0.18, -0.48, 0);
    for (const s of [1, -1]) add(blade, rbox(0.35, 0.6, 0.05, 0.02), 'body', 0.12, 0, s * 1.82);
    link(blade, V(0.05, 0.2, -1.2), V(0.05, 0.2, 1.2), 0.05, 'dark');
    for (const s of [1, -1]) ram(g, V(1.6, 1.45, s * 0.3), V(1.05 + s * 0.48, 0.8, s * 0.99));
    // Rear: cab, engine, tandem drive, ripper.
    add(g, rbox(1.9, 0.35, 1.9), 'dark', -0.55, 1.4, 0);
    cab(g, -0.5, 1.55, 0, 1.6, 1.7, 1.8);
    ladder(g, -0.2, 0.3, 1.05, 1.25, 'z');
    add(g, rbox(2.5, 1.05, 1.75, 0.12), 'body', -2.75, 1.5, 0);
    grille(g, -4.01, 1.5, 0, 0.7, 1.4, 8);
    railing(g, V(-1.6, 2.05, 0.8), V(-3.8, 2.05, 0.8), 0.45);
    railing(g, V(-1.6, 2.05, -0.8), V(-3.8, 2.05, -0.8), 0.45);
    exhaust(g, -2.2, 2.0, 0.5, 0.8);
    for (const s of [1, -1]) {
      add(g, rbox(2.5, 0.55, 0.25), 'dark', -2.35, 0.7, s * 0.85);
      tyre(g, -1.65, 0.65, s * 1.17, 0.65, 0.45, -1.4);
      tyre(g, -3.05, 0.65, s * 1.17, 0.65, 0.45, -1.4);
      add(g, rbox(2.8, 0.06, 0.55, 0.02), 'body', -2.35, 1.38, s * 1.17);
      add(g, cylX(0.06, 0.05, 10), 'light', -4.03, 1.15, s * 0.65);
    }
    add(g, rbox(0.3, 0.3, 1.6), 'dark', -4.2, 0.95, 0);
    for (const z of [-0.5, 0, 0.5]) add(g, rbox(0.12, 0.8, 0.1, 0.03), 'steel', -4.35, 0.5, z, 0, 0, -0.3);
    return g;
  }

  // ---------------------------------------------------------------- asphalt paver
  function track(parent, z, len, r, w) {
    add(parent, rbox(len - r * 1.6, r * 1.3, w * 0.8), 'dark', 0, r, z);
    for (const s of [1, -1]) add(parent, cylZ(r, w, 20), 'dark', s * (len / 2 - r), r, z);
    const n = Math.round(len / 0.18);
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + r + ((i + 0.5) / n) * (len - 2 * r);
      add(parent, box(0.12, 0.05, w), 'steel', x, 0.03, z);
      add(parent, box(0.12, 0.05, w), 'steel', x, 2 * r - 0.03, z);
    }
    for (let x = -len / 2 + r * 1.6; x <= len / 2 - r * 1.6; x += 0.55) add(parent, cylZ(0.13, w + 0.04, 12), 'steel', x, r * 0.45, z);
  }

  function paver() {
    const g = new THREE.Group();
    for (const s of [1, -1]) track(g, s * 0.95, 3.4, 0.38, 0.42);
    // Hopper with folding wings and push rollers.
    add(g, box(1.4, 0.1, 1.6), 'dark', 2.15, 0.85, 0);
    for (const s of [1, -1]) {
      add(g, rbox(1.4, 0.07, 1.05, 0.02), 'body', 2.15, 1.2, s * 1.15, s * 0.6, 0, 0);
      add(g, rbox(0.06, 0.65, 0.9, 0.02), 'body', 2.85, 1.15, s * 1.15);
      add(g, cylZ(0.18, 0.35, 14), 'dark', 3.0, 0.5, s * 0.65);
    }
    // Main body, engine hood with side grille, operator deck, consoles, seats, canopy.
    add(g, rbox(2.6, 1.1, 2.2), 'body', 0, 1.25, 0);
    add(g, rbox(1.3, 0.6, 2.1, 0.1), 'body', -0.2, 2.1, 0);
    for (const s of [1, -1]) {
      for (let i = 0; i < 5; i++) add(g, box(1.0, 0.04, 0.02), 'dark', -0.2, 1.95 + i * 0.08, s * 1.06);
    }
    add(g, rbox(1.4, 0.1, 2.6), 'dark', -1.35, 1.85, 0);
    for (const s of [1, -1]) {
      add(g, rbox(0.4, 0.65, 0.45), 'body', -1.05, 2.22, s * 0.85);
      add(g, rbox(0.45, 0.1, 0.45), 'dark', -1.5, 2.15, s * 0.85);
      add(g, rbox(0.1, 0.5, 0.45), 'dark', -1.75, 2.4, s * 0.85);
    }
    railing(g, V(-2.0, 1.9, 1.25), V(-2.0, 1.9, -1.25), 0.8);
    for (const [x, z] of [[-0.6, 1.2], [-0.6, -1.2], [-1.95, 1.2], [-1.95, -1.2]]) link(g, V(x, 1.9, z), V(x, 3.3, z), 0.04, 'steel', 8);
    add(g, rbox(1.7, 0.08, 2.7, 0.03), 'body', -1.25, 3.33, 0);
    add(g, cylY(0.07, 0.12, 12), 'light', -0.7, 3.43, 0.9);
    exhaust(g, 0.3, 2.4, -0.6, 0.6);
    // Auger (helix) and screed with end gates.
    const helix = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      helix.push(V(Math.cos(t * 40) * 0.17, Math.sin(t * 40) * 0.17, -1.5 + t * 3.0));
    }
    const auger = group(g, -1.75, 0.3, 0);
    add(auger, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 240, 0.025, 6), 'steel');
    add(auger, cylZ(0.05, 3.1, 10), 'dark');
    spinners.push({ obj: auger, axis: 'z', speed: 3 });
    add(g, rbox(0.7, 0.55, 3.1), 'body', -2.25, 0.42, 0);
    add(g, rbox(0.3, 0.15, 3.1, 0.04), 'dark', -2.65, 0.75, 0);
    for (const s of [1, -1]) add(g, box(0.9, 0.6, 0.05), 'body', -2.1, 0.32, s * 1.58);
    railing(g, V(-2.55, 0.7, 1.4), V(-2.55, 0.7, -1.4), 0.6);
    return g;
  }

  // ---------------------------------------------------------------- truck base (mixer, pump)
  function truck(parent, cabX, axles) {
    for (const s of [1, -1]) add(parent, box(8.4, 0.3, 0.16), 'dark', -0.3, 0.95, s * 0.45);
    // Cab: body, windscreen, side windows, grille, bumper, lights, mirrors, steps, visor.
    const c = group(parent, cabX, 0, 0);
    add(c, rbox(1.9, 1.75, 2.35, 0.16), 'body', 0, 2.0, 0);
    add(c, rbox(0.08, 0.75, 2.05, 0.03), 'glass', 0.93, 2.45, 0, 0, 0, -0.08);
    for (const s of [1, -1]) add(c, rbox(0.9, 0.6, 0.06, 0.02), 'glass', 0.15, 2.45, s * 1.16);
    grille(c, 0.97, 1.55, 0, 0.55, 1.2, 6);
    add(c, rbox(0.3, 0.32, 2.45, 0.08), 'steel', 1.05, 0.95, 0);
    for (const s of [1, -1]) {
      add(c, rbox(0.06, 0.16, 0.36, 0.03), 'light', 1.0, 1.2, s * 0.9);
      link(c, V(0.85, 2.6, s * 1.15), V(1.05, 2.6, s * 1.4), 0.02, 'dark');
      add(c, rbox(0.06, 0.38, 0.2, 0.03), 'dark', 1.05, 2.5, s * 1.45);
      add(c, box(0.4, 0.06, 0.25), 'steel', 0.45, 0.62, s * 1.08);
      add(c, box(0.4, 0.06, 0.25), 'steel', 0.45, 0.95, s * 1.08);
    }
    add(c, rbox(0.4, 0.07, 2.3, 0.03), 'body', 1.05, 2.92, 0);
    add(c, cylY(0.07, 0.12, 12), 'light', -0.3, 2.95, 0.7);
    exhaust(parent, cabX - 1.05, 1.0, 0.95, 2.2);
    for (const ax of axles) {
      for (const s of [1, -1]) {
        tyre(parent, ax, 0.52, s * 0.98, 0.52, 0.42, -1.6);
        add(parent, rbox(1.2, 0.06, 0.55, 0.02), 'dark', ax, 1.1, s * 0.98);
      }
      add(parent, cylZ(0.08, 1.6, 10), 'dark', ax, 0.52, 0);
    }
    add(parent, rbox(0.25, 0.25, 2.3, 0.05), 'dark', -4.5, 0.85, 0);
    for (const s of [1, -1]) add(parent, rbox(0.05, 0.12, 0.3, 0.02), 'light', -4.63, 0.9, s * 0.85);
  }

  // ---------------------------------------------------------------- concrete mixer truck
  function mixer() {
    const g = new THREE.Group();
    truck(g, 3.4, [3.3, -1.5, -2.85]);
    add(g, cylX(0.28, 1.0, 16), 'steel', 1.6, 0.85, 1.0);
    add(g, cylX(0.3, 1.6, 16), 'steel', 0.4, 1.5, -1.0);
    // Drum: pear-shaped lathe, tilted up towards the rear, with ring tracks and an external helix stripe.
    const prof = [[0.25, -2.4], [0.6, -2.2], [1.05, -1.3], [1.2, -0.3], [1.12, 0.7], [0.8, 1.7], [0.45, 2.25], [0.32, 2.4]];
    const radiusAt = y => {
      for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) {
        const [r0, y0] = prof[i - 1], [r1, y1] = prof[i];
        return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
      }
      return prof[prof.length - 1][0];
    };
    const holder = group(g, -0.7, 2.45, 0);
    holder.rotation.z = Math.PI / 2 + 0.22;
    const drum = group(holder);
    add(drum, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40), 'steel');
    const helix = [];
    for (let i = 0; i <= 160; i++) {
      const y = -1.9 + (i / 160) * 3.7;
      const a = y * 3.2;
      const r = radiusAt(y) + 0.02;
      helix.push(V(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    add(drum, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 320, 0.05, 6), 'body');
    for (const y of [-1.0, 1.1]) add(drum, new THREE.TorusGeometry(radiusAt(y) + 0.03, 0.05, 8, 40), 'dark', 0, y, 0, Math.PI / 2);
    spinners.push({ obj: drum, axis: 'y', speed: 1.4 });
    // Pedestals, charge hopper, discharge chute, ladder.
    add(g, rbox(0.5, 1.4, 1.3), 'body', 1.75, 1.75, 0);
    for (const s of [1, -1]) link(g, V(-3.2, 1.1, s * 0.6), V(-2.6, 3.0, s * 0.4), 0.08, 'body');
    add(g, new THREE.CylinderGeometry(0.6, 0.25, 0.6, 16, 1, true), 'body', -3.35, 3.6, 0);
    const chute = add(g, new THREE.CylinderGeometry(0.28, 0.28, 1.6, 12, 1, true, 0, Math.PI).rotateZ(Math.PI / 2), 'body', -4.0, 2.4, 0);
    chute.rotation.set(Math.PI, 0.5, -0.55);
    ladder(g, -3.9, 1.0, -0.7, 2.6, 'x');
    return g;
  }

  // ---------------------------------------------------------------- concrete pump truck
  function pump() {
    const g = new THREE.Group();
    truck(g, 3.6, [3.5, -1.6, -2.95]);
    add(g, rbox(5.6, 0.75, 2.2), 'body', -1.2, 1.45, 0);
    for (let x = -3.6; x < 1.2; x += 0.6) add(g, box(0.04, 0.5, 0.03), 'dark', x, 1.45, 1.11);
    // Outriggers: beams swung out with jacks and pads.
    for (const [x, ang] of [[1.3, 0.45], [-3.4, -0.45]]) {
      for (const s of [1, -1]) {
        const end = V(x + Math.sin(ang) * 2.4, 1.35, s * (1.0 + Math.cos(ang) * 2.4));
        link(g, V(x, 1.35, s * 0.9), end, 0.14, 'body', 8);
        link(g, end, end.clone().setY(0.1), 0.09, 'steel', 10);
        add(g, cylY(0.32, 0.07, 16), 'dark', end.x, 0.04, end.z);
      }
    }
    // Turret and four-section boom with rams and concrete pipe; the turret slowly slews, the boom breathes.
    const turret = group(g, 1.0, 1.85, 0);
    add(turret, cylY(0.65, 0.6, 24), 'steel');
    add(turret, rbox(1.1, 0.7, 0.9), 'body', 0, 0.6, 0);
    spinners.push({ obj: turret, axis: 'y', swing: [0, 0.35], speed: 0.25 });
    let parent = group(turret, 0, 0.8, 0);
    const root = parent;
    const sections = [[5.2, 1.05], [4.6, -1.25], [4.0, -1.0], [3.2, -0.55]];
    sections.forEach(([len, ang], i) => {
      const seg = group(parent);
      seg.rotation.z = ang;
      const t = 0.42 - i * 0.07;
      add(seg, rbox(len, t, t * 0.85, 0.05), 'body', len / 2, 0, 0);
      add(seg, cylX(0.07, len * 0.95, 10), 'steel', len / 2, 0, t * 0.62);
      ram(seg, V(0.4, -t * 0.6, 0), V(len * 0.35, -t * 0.55, 0), 0.08 - i * 0.012);
      add(seg, cylZ(t * 0.6, t * 0.95, 14), 'dark', 0, 0, 0);
      const next = group(seg, len, 0, 0);
      parent = next;
    });
    link(parent, V(0, 0, 0), V(0.4, -1.4, 0), 0.08, 'dark', 10);
    spinners.push({ obj: root, axis: 'z', swing: [0, 0.08], speed: 0.5 });
    // Rear hopper with grid, water tank.
    add(g, rbox(1.0, 0.7, 1.4), 'body', -4.15, 1.1, 0);
    for (let z = -0.55; z <= 0.55; z += 0.22) add(g, box(0.9, 0.03, 0.03), 'dark', -4.15, 1.47, z);
    add(g, cylX(0.35, 1.5, 16), 'steel', 0.3, 1.0, -1.2);
    return g;
  }

  // ---------------------------------------------------------------- tower crane
  // Lattice mast that climbs section by section, slewing jib with trolley and hook.
  // Control it with g.userData.setSections(n) and g.userData.point(worldTarget, hookY).
  function towerCrane({ sections = 26, sectionH = 3.5, jib = 42, counter = 14, mastW = 1.8 } = {}) {
    const g = new THREE.Group();
    add(g, rbox(5, 1.2, 5), 'dark', 0, 0.6, 0);
    const mast = group(g);
    const secs = [];
    const h2 = mastW / 2;
    for (let i = 0; i < sections; i++) {
      const s = group(mast, 0, i * sectionH, 0);
      const c = [[h2, h2], [h2, -h2], [-h2, -h2], [-h2, h2]];
      for (const [x, z] of c) link(s, V(x, 0, z), V(x, sectionH, z), 0.09, 'body', 6);
      for (let k = 0; k < 4; k++) {
        const [a, b] = [c[k], c[(k + 1) % 4]];
        link(s, V(a[0], 0, a[1]), V(b[0], 0, b[1]), 0.05, 'body', 5);
        link(s, V(a[0], 0, a[1]), V(b[0], sectionH, b[1]), 0.04, 'body', 5);
      }
      secs.push(s);
    }
    // Slewing part: turntable, cab, A-frame, jib, counter-jib with ballast, pendants, trolley, hook.
    const slew = group(g);
    add(slew, cylY(1.4, 0.6, 16), 'dark', 0, 0.3, 0);
    add(slew, rbox(2.2, 2.0, 1.6, 0.1), 'body', 1.2, 1.4, mastW / 2 + 0.9);
    add(slew, box(0.05, 1.0, 1.4), 'glass', 2.32, 1.6, mastW / 2 + 0.9);
    const jibLattice = (len, dir) => {
      const top = 1.6, half = 0.6;
      for (let x = 0; x < len; x += 3) {
        const x1 = Math.min(len, x + 3);
        for (const z of [half, -half]) {
          link(slew, V(dir * x, 0.6, z), V(dir * x1, 0.6, z), 0.07, 'body', 5);
          link(slew, V(dir * x, 0.6, z), V(dir * ((x + x1) / 2), 0.6 + top, 0), 0.04, 'body', 5);
          link(slew, V(dir * x1, 0.6, z), V(dir * ((x + x1) / 2), 0.6 + top, 0), 0.04, 'body', 5);
        }
        link(slew, V(dir * x, 0.6, half), V(dir * x, 0.6, -half), 0.04, 'body', 5);
      }
      link(slew, V(0, 0.6 + top, 0), V(dir * len, 0.6 + top, 0), 0.06, 'body', 5);
    };
    jibLattice(jib, 1);
    jibLattice(counter, -1);
    for (let i = 0; i < 4; i++) add(slew, rbox(1.2, 1.6, 2.2, 0.08), 'steel', -counter + 1 + i * 1.3, -0.4, 0);
    const apex = V(0, 7, 0);
    for (const z of [0.8, -0.8]) link(slew, V(0, 0.6, z), apex, 0.08, 'body', 6);
    link(slew, apex, V(jib * 0.65, 2.2, 0), 0.03, 'dark', 4);
    link(slew, apex, V(-counter + 0.5, 2.2, 0), 0.03, 'dark', 4);
    add(slew, cylY(0.1, 0.2, 8), 'light', 0, 7.15, 0);
    const trolley = group(slew, jib * 0.5, 0.35, 0);
    add(trolley, rbox(1.4, 0.4, 1.4, 0.05), 'dark');
    const cable = add(trolley, cylY(0.03, 1, 4).translate(0, -0.5, 0), 'dark');
    const hook = group(trolley);
    add(hook, rbox(0.7, 0.9, 0.5, 0.08), 'body', 0, 0.2, 0);
    add(hook, new THREE.TorusGeometry(0.22, 0.06, 6, 12, Math.PI * 1.4), 'steel', 0, -0.45, 0);
    const load = group(hook, 0, -0.9, 0);

    let topY = 0;
    const setSections = n => {
      n = Math.max(2, Math.min(sections, Math.round(n)));
      secs.forEach((s, i) => (s.visible = i < n));
      topY = n * sectionH;
      slew.position.y = topY;
    };
    const tmp = new THREE.Vector3();
    // Aim the jib at a world point and lower the hook to world height hookY.
    const point = (target, hookY) => {
      g.updateMatrixWorld(true);
      tmp.copy(target);
      g.worldToLocal(tmp);
      slew.rotation.y = Math.atan2(-tmp.z, tmp.x);
      trolley.position.x = Math.min(jib - 1, Math.max(4, Math.hypot(tmp.x, tmp.z)));
      const drop = Math.max(1, topY + 0.35 - (hookY - g.position.y));
      cable.scale.y = drop;
      hook.position.y = -drop;
    };
    setSections(sections);
    g.userData = { setSections, point, load, get topY() { return topY; }, sectionH };
    return g;
  }

  return { build: { roller, grader, paver, mixer, pump, towerCrane }, spinners };
}
