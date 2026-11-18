import fs from "node:fs";
import path from "node:path";
import { dirpinDir, legacyDirpinDir, pinsPath } from "./paths.js";

/** Ensure `~/.dirpin` exists; rename `~/.dpin` once if present. */
export function ensureDirpinDir() {
  const dest = dirpinDir();
  const legacy = legacyDirpinDir();
  if (!fs.existsSync(dest) && fs.existsSync(legacy)) {
    try {
      fs.renameSync(legacy, dest);
    } catch {
      fs.cpSync(legacy, dest, { recursive: true });
    }
  }
  fs.mkdirSync(dest, { recursive: true });
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
  ensureDirpinDir();
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
