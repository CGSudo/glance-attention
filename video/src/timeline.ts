import { Easing, interpolate, interpolateColors } from "remotion";

export const palette = {
  cream: "#F4EAD5",
  ink: "#1B1A17",
  ochre: "#D9A441",
  terra: "#C65D3B",
  teal: "#0F766E",
  hazard: "#F2C230",
};

const smooth = Easing.bezier(0.77, 0, 0.175, 1);
const out = Easing.bezier(0.23, 1, 0.32, 1);

export const between = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: smooth,
  });

export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const color = (a: string, b: string, p: number) =>
  interpolateColors(p, [0, 1], [a, b]);

// Shared sheet: window light → triangle → painting. Vertices retain identity.
export const lightShape = (triangle: number, unfold: number) => {
  const points: string[] = [];
  const corners = [[500, 45], [810, 585], [190, 585]];
  for (let i = 0; i < 60; i++) {
    const angle = -Math.PI / 2 + (i / 60) * Math.PI * 2;
    const edge = i / 20;
    const a = corners[Math.floor(edge)];
    const b = corners[(Math.floor(edge) + 1) % 3];
    const tx = mix(a[0], b[0], edge % 1);
    const ty = mix(a[1], b[1], edge % 1);
    const bx = 795 + Math.cos(angle) * 150;
    const by = 210 + Math.sin(angle) * 175;
    const radius = 1 / Math.max(Math.abs(Math.cos(angle)) / 500, Math.abs(Math.sin(angle)) / 325);
    const rx = 500 + Math.cos(angle) * radius;
    const ry = 325 + Math.sin(angle) * radius;
    points.push(`${mix(mix(bx, tx, triangle), rx, unfold).toFixed(2)},${mix(mix(by, ty, triangle), ry, unfold).toFixed(2)}`);
  }
  return points.join(" ");
};

export const pop = (t: number, at: number) =>
  interpolate(t - at, [0, 0.1, 0.3, 0.48, 0.7], [0, -0.07, 1.1, 0.98, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: out,
  });

export const captions = [
  { from: 0, to: 6, lines: ["Where do", "eyes go", "first?"], tag: "01 / OBSERVE" },
  { from: 6, to: 12, lines: ["Painters", "squint."], tag: "02 / THE TRICK" },
  { from: 12, to: 20.5, lines: ["Blur. Grey.", "The brightest", "spot wins."], tag: "03 / LIGHT ONLY" },
  { from: 20.5, to: 28.6, lines: ["But that’s not", "where people", "look."], tag: "04 / THE CATCH" },
  { from: 28.6, to: 31.8, lines: ["Faces pull", "first."], tag: "05 / ATTENTION" },
  { from: 31.8, to: 35.1, lines: ["We follow", "where others", "look."], tag: "05 / ATTENTION" },
  { from: 35.1, to: 38.4, lines: ["Words pull", "next."], tag: "05 / ATTENTION" },
  { from: 38.4, to: 42.35, lines: ["Then brightness", "and contrast."], tag: "05 / ATTENTION" },
  { from: 42.35, to: 45.65, lines: ["See what", "people see", "first."], tag: "" },
  { from: 45.65, to: 48, lines: ["Free · Open source", "Runs on your device"], tag: "" },
];

export const stillFrames = [100, 278, 515, 730, 1100, 1345];
