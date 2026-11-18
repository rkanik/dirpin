import { validateAlias } from "../alias.js";
import { loadPins } from "../store.js";

export function cmdPath(args) {
  const alias = validateAlias(args[0]);
  const pins = loadPins();
  if (!pins[alias]) {
    throw new Error(`No pin named '${alias}'`);
  }
  console.log(pins[alias]);
}
