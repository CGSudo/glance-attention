import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(__dirname, "../assets/video");

const CHECKS = [
  { file: "glance-intro.mp4", maxBytes: 10 * 1024 * 1024 },
  { file: "glance-intro.webm", maxBytes: 8 * 1024 * 1024 },
  { file: "glance-intro-preview.gif", maxBytes: 8 * 1024 * 1024 },
  { file: "glance-intro-poster.png", maxBytes: Infinity },
  { file: "stills/beat-1.png", maxBytes: Infinity },
  { file: "stills/beat-2.png", maxBytes: Infinity },
  { file: "stills/beat-3.png", maxBytes: Infinity },
  { file: "stills/beat-4.png", maxBytes: Infinity },
  { file: "stills/beat-5.png", maxBytes: Infinity },
  { file: "stills/beat-6.png", maxBytes: Infinity },
];

let allPassed = true;

console.log("Checking deliverables in assets/video/:\n");

for (const check of CHECKS) {
  const fullPath = path.join(videoDir, check.file);
  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: Missing ${check.file}`);
    allPassed = false;
    continue;
  }
  const stat = fs.statSync(fullPath);
  const mb = (stat.size / (1024 * 1024)).toFixed(2);
  const maxMb = check.maxBytes === Infinity ? "no limit" : `${(check.maxBytes / (1024 * 1024)).toFixed(0)} MB`;

  if (stat.size > check.maxBytes) {
    console.error(`FAIL: ${check.file} is ${mb} MB (exceeds ${maxMb})`);
    allPassed = false;
  } else {
    console.log(`PASS: ${check.file} (${mb} MB <= ${maxMb})`);
  }
}

// Check NOTES.md
const notesPath = path.join(__dirname, "NOTES.md");
if (fs.existsSync(notesPath)) {
  const lines = fs.readFileSync(notesPath, "utf-8").trim().split("\n");
  if (lines.length <= 15) {
    console.log(`PASS: video/NOTES.md (${lines.length} lines <= 15)`);
  } else {
    console.error(`FAIL: video/NOTES.md has ${lines.length} lines (> 15)`);
    allPassed = false;
  }
} else {
  console.error("FAIL: Missing video/NOTES.md");
  allPassed = false;
}

if (!allPassed) {
  process.exit(1);
}

console.log("\nAll checks passed successfully!");
