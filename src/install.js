import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { ensureDirpinDir } from "./store.js";
import { writeHooks } from "./hooks.js";
import {
  autorunCmdPath,
  binDir,
  CLI_NAMES,
  hooksPs1Path,
  hooksShPath,
  installedPath,
  wrapperCmdPath,
} from "./paths.js";

const BEGIN = "# >>> dirpin >>>";
const END = "# <<< dirpin <<<";
const LEGACY_BEGIN = "# >>> dpin >>>";
const LEGACY_END = "# <<< dpin <<<";
const AUTORUN_KEY = String.raw`HKCU\Software\Microsoft\Command Processor`;

function home() {
  return os.homedir();
}

function cliJsPath() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "cli.js");
}

/** Profile block: load pins + wrap CLI names so mutate cmds re-source in this shell. */
function unixBlock() {
  const wrappers = CLI_NAMES.flatMap((name) => [
    `${name}() {`,
    `  DIRPIN_SHELL=1 command ${name} "$@"`,
    `  local __dirpin_r=$?`,
    `  case "$1" in`,
    `    add|remove|rm|init)`,
    `      [ -f "$HOME/.dirpin/hooks.sh" ] && . "$HOME/.dirpin/hooks.sh"`,
    `      ;;`,
    `  esac`,
    `  return $__dirpin_r`,
    `}`,
  ]);
  return [
    BEGIN,
    `[ -f "$HOME/.dirpin/hooks.sh" ] && . "$HOME/.dirpin/hooks.sh"`,
    ...wrappers,
    END,
    "",
  ].join("\n");
}

function ps1Block() {
  const hooks = hooksPs1Path().replace(/'/g, "''");
  const wrappers = CLI_NAMES.flatMap((name) => [
    `function ${name} {`,
    `  $__dirpinApp = Get-Command ${name} -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1`,
    `  if (-not $__dirpinApp) { Write-Error '${name} not found on PATH (npm i -g dirpin)'; return }`,
    `  $env:DIRPIN_SHELL = '1'`,
    `  & $__dirpinApp.Source @args`,
    `  $__dirpinCode = $LASTEXITCODE`,
    `  Remove-Item Env:DIRPIN_SHELL -ErrorAction SilentlyContinue`,
    `  if ($args.Count -ge 1 -and @('add','remove','rm','init') -contains $args[0]) {`,
    `    if (Test-Path '${hooks}') { . '${hooks}' }`,
    `  }`,
    `}`,
  ]);
  return [
    BEGIN,
    `if (Test-Path '${hooks}') { . '${hooks}' }`,
    ...wrappers,
    END,
    "",
  ].join("\n");
}

function markerPair(content) {
  for (const [start, end] of [
    [BEGIN, END],
    [LEGACY_BEGIN, LEGACY_END],
  ]) {
    if (content.includes(start) && content.includes(end)) {
      return [start, end];
    }
  }
  return null;
}

function upsertBlock(filePath, block) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  let content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  const markers = markerPair(content);
  if (markers) {
    const [start, end] = markers;
    const re = new RegExp(
      `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}\\n?`,
      "m",
    );
    content = content.replace(re, block.trimEnd() + "\n");
  } else {
    if (content.length && !content.endsWith("\n")) content += "\n";
    content += (content.length ? "\n" : "") + block;
  }
  fs.writeFileSync(filePath, content, "utf8");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patchBash() {
  const bashrc = path.join(home(), ".bashrc");
  upsertBlock(bashrc, unixBlock());

  if (process.platform === "darwin") {
    const profile = path.join(home(), ".bash_profile");
    const existing = fs.existsSync(profile)
      ? fs.readFileSync(profile, "utf8")
      : "";
    if (!existing.includes(".bashrc")) {
      const bootstrap = [
        BEGIN,
        '[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc"',
        END,
        "",
      ].join("\n");
      upsertBlock(profile, bootstrap);
    }
  }
}

function patchZsh() {
  upsertBlock(path.join(home(), ".zshrc"), unixBlock());
}

function patchPowerShell() {
  const documents = path.join(home(), "Documents");

  const candidates = [
    process.env.PROFILE,
    path.join(
      documents,
      "WindowsPowerShell",
      "Microsoft.PowerShell_profile.ps1",
    ),
    path.join(documents, "PowerShell", "Microsoft.PowerShell_profile.ps1"),
  ].filter(Boolean);

  const unique = [...new Set(candidates.map((p) => path.resolve(p)))];
  for (const file of unique) {
    upsertBlock(file, ps1Block());
  }
}

function writeCmdSupport() {
  ensureDirpinDir();
  fs.mkdirSync(binDir(), { recursive: true });

  const cli = cliJsPath();
  const wrapper = [
    "@echo off",
    "setlocal",
    "set DIRPIN_SHELL=1",
    `node "${cli}" %*`,
    "set \"_dirpin_ec=%ERRORLEVEL%\"",
    'if /I "%~1"=="add" goto :dirpin_reload',
    'if /I "%~1"=="remove" goto :dirpin_reload',
    'if /I "%~1"=="rm" goto :dirpin_reload',
    'if /I "%~1"=="init" goto :dirpin_reload',
    "exit /b %_dirpin_ec%",
    ":dirpin_reload",
    'call "%USERPROFILE%\\.dirpin\\hooks.cmd"',
    "exit /b %_dirpin_ec%",
    "",
  ].join("\r\n");
  for (const name of CLI_NAMES) {
    fs.writeFileSync(wrapperCmdPath(name), wrapper, "utf8");
  }

  const autorun = [
    "@echo off",
    'set "PATH=%USERPROFILE%\\.dirpin\\bin;%PATH%"',
    'if exist "%USERPROFILE%\\.dirpin\\hooks.cmd" call "%USERPROFILE%\\.dirpin\\hooks.cmd"',
    "",
  ].join("\r\n");
  fs.writeFileSync(autorunCmdPath(), autorun, "utf8");
}

function readAutoRun() {
  try {
    const out = execFileSync(
      "reg",
      ["query", AUTORUN_KEY, "/v", "AutoRun"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const match = out.match(/AutoRun\s+REG_(?:SZ|EXPAND_SZ)\s+(.*)/i);
    return match ? match[1].trim() : "";
  } catch {
    return "";
  }
}

function writeAutoRun(value) {
  execFileSync(
    "reg",
    ["add", AUTORUN_KEY, "/v", "AutoRun", "/t", "REG_SZ", "/d", value, "/f"],
    { stdio: "ignore" },
  );
}

function patchCmd() {
  if (process.platform !== "win32") return;

  writeCmdSupport();

  const autorun = path.resolve(autorunCmdPath());
  const quoted = `"${autorun}"`;
  const current = readAutoRun();
  const lower = current.toLowerCase();

  if (
    lower.includes(autorun.toLowerCase()) ||
    lower.includes(".dirpin\\autorun.cmd") ||
    lower.includes(".dirpin/autorun.cmd")
  ) {
    return;
  }

  // Migrate ~/.dpin AutoRun → ~/.dirpin
  if (/\.dpin[/\\]autorun\.cmd/i.test(current)) {
    const updated = current.replace(
      /"?[^"&]*\.dpin[/\\]autorun\.cmd"?/gi,
      quoted,
    );
    writeAutoRun(updated);
    return;
  }

  // Upgrade old hooks.cmd-only AutoRun
  if (
    /\.d(?:ir)?pin[/\\]hooks\.cmd/i.test(current) &&
    !current.includes("&")
  ) {
    writeAutoRun(quoted);
    return;
  }

  if (/\.d(?:ir)?pin[/\\]hooks\.cmd/i.test(current)) {
    const updated = current.replace(
      /"?[^"&]*\.d(?:ir)?pin[/\\]hooks\.cmd"?/gi,
      quoted,
    );
    writeAutoRun(updated);
    return;
  }

  if (!current) {
    writeAutoRun(quoted);
  } else {
    writeAutoRun(`${quoted} & ${current}`);
  }
}

export function loadInstalled() {
  if (!fs.existsSync(installedPath())) return null;
  try {
    return JSON.parse(fs.readFileSync(installedPath(), "utf8"));
  } catch {
    return null;
  }
}

function saveInstalled(meta) {
  ensureDirpinDir();
  fs.writeFileSync(
    installedPath(),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8",
  );
}

/**
 * Idempotent: write hooks + patch profiles / cmd AutoRun.
 * @param {{ shells?: string[] }} [opts]
 * @returns {{ firstInstall: boolean, shells: string[] }}
 */
export function ensureInstalled(opts = {}) {
  ensureDirpinDir();
  writeHooks();

  const requested = opts.shells?.length
    ? new Set(opts.shells.map((s) => s.toLowerCase()))
    : null;

  const targets = requested ?? new Set([
    "bash",
    "zsh",
    "powershell",
    ...(process.platform === "win32" ? ["cmd"] : []),
  ]);

  const applied = [];

  if (targets.has("bash")) {
    patchBash();
    applied.push("bash");
  }
  if (targets.has("zsh")) {
    patchZsh();
    applied.push("zsh");
  }
  if (targets.has("powershell") || targets.has("pwsh")) {
    patchPowerShell();
    applied.push("powershell");
  }
  if (targets.has("cmd") && process.platform === "win32") {
    patchCmd();
    applied.push("cmd");
  }

  const prev = loadInstalled();
  const firstInstall = !prev;
  saveInstalled({
    at: new Date().toISOString(),
    shells: applied,
    platform: process.platform,
  });

  return { firstInstall, shells: applied };
}

/** Source line for bash/zsh — use: eval "$(dirpin shellenv)" */
export function shellenvLine() {
  const sh = hooksShPath().replace(/\\/g, "/");
  return `. "${sh}"`;
}

export function shellenvPs1Line() {
  const hooks = hooksPs1Path();
  return `. '${hooks.replace(/'/g, "''")}'`;
}

/**
 * Hint only when not already inside shell wrapper (DIRPIN_SHELL=1).
 * Wrapper re-sources hooks after mutate — no manual reload.
 */
export function reloadHint() {
  if (
    process.env.DIRPIN_SHELL === "1" ||
    process.env.DPIN_SHELL === "1"
  ) {
    return null;
  }

  if (process.platform === "win32") {
    return (
      "Load pins in THIS shell once:  . $HOME\\.dirpin\\hooks.ps1  (PowerShell)  |  " +
      "%USERPROFILE%\\.dirpin\\hooks.cmd  (cmd)  |  source ~/.dirpin/hooks.sh  (bash). " +
      "Later `dirpin add/remove` auto-reloads (use dirpin/dpin/dpn, not `npx dirpin`)."
    );
  }
  return (
    "Load pins in THIS shell once:  eval \"$(dirpin shellenv)\"  or  source ~/.dirpin/hooks.sh. " +
    "Later `dirpin add/remove` auto-reloads (use dirpin/dpin/dpn, not `npx dirpin`)."
  );
}

export function printReloadHint() {
  const hint = reloadHint();
  if (hint) console.log(hint);
}
