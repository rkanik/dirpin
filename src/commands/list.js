import { loadPins } from "../store.js";

export function cmdList() {
  const pins = loadPins();
  const entries = Object.entries(pins).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) {
    console.log("No pins yet. Try: dpin add <alias> [path]");
    return;
  }
  const width = Math.max(...entries.map(([a]) => a.length), 5);
  for (const [alias, dir] of entries) {
    console.log(`${alias.padEnd(width)}  ${dir}`);
  }
}
