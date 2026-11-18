import os from "node:os";
import path from "node:path";

export function dirpinDir() {
  return path.join(os.homedir(), ".dirpin");
}

/** Previous data dir — migrated once into `.dirpin`. */
export function legacyDirpinDir() {
  return path.join(os.homedir(), ".dpin");
}

export function pinsPath() {
  return path.join(dirpinDir(), "pins.json");
}

export function hooksShPath() {
  return path.join(dirpinDir(), "hooks.sh");
}

export function hooksPs1Path() {
  return path.join(dirpinDir(), "hooks.ps1");
}

export function hooksCmdPath() {
  return path.join(dirpinDir(), "hooks.cmd");
}

export function autorunCmdPath() {
  return path.join(dirpinDir(), "autorun.cmd");
}

export function binDir() {
  return path.join(dirpinDir(), "bin");
}

/** Primary CLI + short aliases (and cmd wrappers under ~/.dirpin/bin). */
export const CLI_NAMES = ["dirpin", "dpin", "dpn"];

export function wrapperCmdPath(name = "dirpin") {
  return path.join(binDir(), `${name}.cmd`);
}

export function installedPath() {
  return path.join(dirpinDir(), "installed.json");
}
