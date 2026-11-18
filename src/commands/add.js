import { validateAlias } from "../alias.js";
import { writeHooks } from "../hooks.js";
import { ensureInstalled, printReloadHint } from "../install.js";
import { loadPins, resolvePinPath, savePins } from "../store.js";

export function cmdAdd(args) {
  const force = args.includes("--force");
  const positional = args.filter((a) => a !== "--force");
  const alias = validateAlias(positional[0]);
  const dir = resolvePinPath(positional[1]);

  const pins = loadPins();
  if (pins[alias] && !force) {
    if (pins[alias] === dir) {
      console.log(`Pinned ${alias} → ${dir} (unchanged)`);
    } else {
      throw new Error(
        `Alias '${alias}' already points to ${pins[alias]}. Use --force to overwrite.`,
      );
    }
  } else {
    pins[alias] = dir;
    savePins(pins);
    console.log(`Pinned ${alias} → ${dir}`);
  }

  writeHooks(pins);
  const { firstInstall, shells } = ensureInstalled();
  if (firstInstall) {
    console.log(`Shell hooks installed (${shells.join(", ")})`);
  }
  printReloadHint();
}
