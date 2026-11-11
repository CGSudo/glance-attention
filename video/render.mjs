import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetsDir = path.resolve(rootDir, "assets/video");
const stillsDir = path.resolve(assetsDir, "stills");

// Locate ffmpeg
let ffmpegPath = "ffmpeg";
try {
  const compositorDir = path.resolve(__dirname, "node_modules/@remotion/compositor-win32-x64-msvc");
  const winFfmpeg = path.join(compositorDir, "ffmpeg.exe");
  if (fs.existsSync(winFfmpeg)) {
    ffmpegPath = winFfmpeg;
  }
} catch {
  // fallback
}

fs.mkdirSync(stillsDir, { recursive: true });

const mp4Path = path.join(assetsDir, "glance-intro.mp4");
const webmPath = path.join(assetsDir, "glance-intro.webm");
const gifPath = path.join(assetsDir, "glance-intro-preview.gif");
const posterPath = path.join(assetsDir, "glance-intro-poster.png");

// 1. Render MP4 if not present
if (!fs.existsSync(mp4Path)) {
  console.log("Rendering MP4...");
  execSync(`npx remotion render GlanceIntro "${mp4Path}" --crf=26`, {
    stdio: "inherit",
    cwd: __dirname,
  });
}

// 2. Render Stills
const stillFrames = [
  { file: "beat-1.png", frame: 100 },
  { file: "beat-2.png", frame: 278 },
  { file: "beat-3.png", frame: 515 },
  { file: "beat-4.png", frame: 730 },
  { file: "beat-5.png", frame: 1100 },
  { file: "beat-6.png", frame: 1345 },
];

for (const { file, frame } of stillFrames) {
  const target = path.join(stillsDir, file);
  if (!fs.existsSync(target)) {
    console.log(`Rendering ${file}...`);
    execSync(`npx remotion still GlanceIntro "${target}" --frame=${frame}`, {
      stdio: "inherit",
      cwd: __dirname,
    });
  }
}

// 3. Poster from beat 5
if (!fs.existsSync(posterPath)) {
  const beat5 = path.join(stillsDir, "beat-5.png");
  if (fs.existsSync(beat5)) {
    fs.copyFileSync(beat5, posterPath);
  } else {
    execSync(`npx remotion still GlanceIntro "${posterPath}" --frame=1100`, {
      stdio: "inherit",
      cwd: __dirname,
    });
  }
}

// 4. WebM via VP9
if (!fs.existsSync(webmPath)) {
  console.log("Encoding WebM (VP9)...");
  execSync(
    `"${ffmpegPath}" -y -i "${mp4Path}" -c:v libvpx-vp9 -b:v 0 -crf 33 -row-mt 1 -threads 8 -cpu-used 4 "${webmPath}"`,
    { stdio: "inherit" }
  );
}

// 5. GIF preview (960x540, 12 fps)
if (!fs.existsSync(gifPath)) {
  console.log("Encoding GIF (960px, 12 fps)...");
  execSync(
    `"${ffmpegPath}" -y -i "${mp4Path}" -r 12 -vf "scale=960:-1,split[s0][s1];[s0]palettegen=max_colors=24[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle" "${gifPath}"`,
    { stdio: "inherit" }
  );
}

// 6. Run checks
execSync("node check.mjs", { stdio: "inherit", cwd: __dirname });
