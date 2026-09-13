import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publicDirectory = path.join(root, "public");
const manifestPath = path.join(publicDirectory, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const requiredTextFields = ["name", "short_name", "start_url", "scope", "display"];
for (const field of requiredTextFields) {
  if (typeof manifest[field] !== "string" || manifest[field].length === 0) {
    throw new Error(`PWA manifest is missing a valid ${field} field.`);
  }
}

if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error("PWA manifest must declare at least one icon.");
}

for (const icon of manifest.icons) {
  if (typeof icon.src !== "string" || !icon.src.startsWith("/")) {
    throw new Error("Every PWA icon must use an absolute same-origin path.");
  }

  const iconPath = path.join(publicDirectory, icon.src.slice(1));
  const iconStats = await stat(iconPath);
  if (!iconStats.isFile() || iconStats.size === 0) {
    throw new Error(`PWA icon is missing or empty: ${icon.src}`);
  }
}

const serviceWorker = await readFile(path.join(publicDirectory, "sw.js"), "utf8");
for (const eventName of ["install", "activate", "fetch"]) {
  if (!serviceWorker.includes(`addEventListener(\"${eventName}\"`)) {
    throw new Error(`Service worker does not handle the ${eventName} event.`);
  }
}

console.log(`Validated ${manifest.icons.length} PWA icons and service-worker lifecycle handlers.`);
