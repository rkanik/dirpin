import os from "node:os";
import path from "node:path";

export function dpinDir() {
  return path.join(os.homedir(), ".dpin");
}

export function pinsPath() {
  return path.join(dpinDir(), "pins.json");
}

export function hooksShPath() {
  return path.join(dpinDir(), "hooks.sh");
}

export function hooksPs1Path() {
  return path.join(dpinDir(), "hooks.ps1");
}

export function hooksCmdPath() {
  return path.join(dpinDir(), "hooks.cmd");
}

export function autorunCmdPath() {
  return path.join(dpinDir(), "autorun.cmd");
}

export function binDir() {
  return path.join(dpinDir(), "bin");
}

/** npm bin names (and cmd wrappers under ~/.dpin/bin). */
export const CLI_NAMES = ["dirpin", "dpin", "dpn"];

export function wrapperCmdPath(name = "dpin") {
  return path.join(binDir(), `${name}.cmd`);
}

export function installedPath() {
  return path.join(dpinDir(), "installed.json");
}
