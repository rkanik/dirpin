import { validateAlias } from "../alias.js";
import { writeHooks } from "../hooks.js";
import { printReloadHint } from "../install.js";
import { loadPins, savePins } from "../store.js";

export function cmdRemove(args) {
  const alias = validateAlias(args[0]);
  const pins = loadPins();
  if (!pins[alias]) {
    throw new Error(`No pin named '${alias}'`);
  }
  delete pins[alias];
  savePins(pins);
  writeHooks(pins);
  console.log(`Removed ${alias}`);
  printReloadHint();
}
