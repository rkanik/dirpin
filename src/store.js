import fs from "node:fs";
import path from "node:path";
import { dpinDir, pinsPath } from "./paths.js";

export function ensureDpinDir() {
  fs.mkdirSync(dpinDir(), { recursive: true });
}

export function loadPins() {
  const file = pinsPath();
  if (!fs.existsSync(file)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
  } catch {
    // corrupt file → start fresh store shape
  }
  return {};
}

export function savePins(pins) {
  ensureDpinDir();
  const sorted = Object.fromEntries(
    Object.entries(pins).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(pinsPath(), JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

export function resolvePinPath(input) {
  const resolved = path.resolve(input ?? process.cwd());
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Not a directory: ${resolved}`);
  }
  return resolved;
}
