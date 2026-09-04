#!/usr/bin/env node
/**
 * Generates small, real sample MP4s + a WebVTT caption track so seeded video
 * lessons actually play and the /api/media streaming path can be exercised
 * end to end. Requires ffmpeg; skips cleanly (and loudly) without it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd(), process.env.STORAGE_LOCAL_ROOT ?? "./storage");
const dir = join(root, "lessons", "video", "seed");
const capDir = join(root, "captions", "seed");
mkdirSync(dir, { recursive: true });
mkdirSync(capDir, { recursive: true });

let hasFfmpeg = true;
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  hasFfmpeg = false;
}

const CLIPS = [
  { key: "intro.mp4", label: "შესავალი", tone: 380, seconds: 12 },
  { key: "lesson-a.mp4", label: "გაკვეთილი", tone: 440, seconds: 20 },
  { key: "lesson-b.mp4", label: "პრაქტიკა", tone: 520, seconds: 16 },
];

if (!hasFfmpeg) {
  console.warn(
    "[sample-media] ffmpeg not found — seeded video lessons will have no playable asset.\n" +
      "              Install ffmpeg and re-run `node scripts/make-sample-media.mjs`, or upload real video in the creator studio.",
  );
} else {
  let made = 0;
  for (const clip of CLIPS) {
    const out = join(dir, clip.key);
    if (existsSync(out)) { made++; continue; }
    try {
      // testsrc2 renders moving content with a built-in timer, so no
      // freetype/drawtext dependency is required.
      execFileSync(
        "ffmpeg",
        [
          "-y", "-loglevel", "error",
          "-f", "lavfi", "-i", `testsrc2=size=1280x720:rate=24:duration=${clip.seconds}`,
          "-f", "lavfi", "-i", `sine=frequency=${clip.tone}:duration=${clip.seconds}`,
          "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-crf", "34",
          "-c:a", "aac", "-b:a", "48k",
          "-movflags", "+faststart",
          out,
        ],
        { stdio: "inherit" },
      );
      made++;
    } catch (error) {
      console.warn(`[sample-media] could not render ${clip.key}:`, error.message.split("\n")[0]);
    }
  }
  console.log(`[sample-media] ${made}/${CLIPS.length} sample clips ready in ${dir}`);
}

writeFileSync(
  join(capDir, "sample.vtt"),
  `WEBVTT

00:00:00.000 --> 00:00:06.000
მოგესალმებით! ამ გაკვეთილში განვიხილავთ ძირითად პრინციპებს.

00:00:06.000 --> 00:00:12.000
დაიწყეთ პრაქტიკული სავარჯიშოებით გაკვეთილის ბოლოს.
`,
  "utf8",
);
console.log("[sample-media] captions ready");
