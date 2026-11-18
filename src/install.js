import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { ensureDpinDir } from "./store.js";
import { writeHooks } from "./hooks.js";
import {
  autorunCmdPath,
  binDir,
  hooksPs1Path,
  hooksShPath,
  installedPath,
  wrapperCmdPath,
} from "./paths.js";

const BEGIN = "# >>> dpin >>>";
const END = "# <<< dpin <<<";
const AUTORUN_KEY = String.raw`HKCU\Software\Microsoft\Command Processor`;

function home() {
  return os.homedir();
}

function cliJsPath() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "cli.js");
}

/** Profile block: load pins + wrap `dpin` so mutate cmds re-source in this shell. */
function unixBlock() {
  return [
    BEGIN,
    `[ -f "$HOME/.dpin/hooks.sh" ] && . "$HOME/.dpin/hooks.sh"`,
    `dpin() {`,
    `  DPIN_SHELL=1 command dpin "$@"`,
    `  local __dpin_r=$?`,
    `  case "$1" in`,
    `    add|remove|rm|init)`,
    `      [ -f "$HOME/.dpin/hooks.sh" ] && . "$HOME/.dpin/hooks.sh"`,
    `      ;;`,
    `  esac`,
    `  return $__dpin_r`,
    `}`,
    END,
    "",
  ].join("\n");
}

function ps1Block() {
  const hooks = hooksPs1Path().replace(/'/g, "''");
  return [
    BEGIN,
    `if (Test-Path '${hooks}') { . '${hooks}' }`,
    `function dpin {`,
    `  $__dpinApp = Get-Command dpin -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1`,
    `  if (-not $__dpinApp) { Write-Error 'dpin not found on PATH (npm i -g dirpin)'; return }`,
    `  $env:DPIN_SHELL = '1'`,
    `  & $__dpinApp.Source @args`,
    `  $__dpinCode = $LASTEXITCODE`,
    `  Remove-Item Env:DPIN_SHELL -ErrorAction SilentlyContinue`,
    `  if ($args.Count -ge 1 -and @('add','remove','rm','init') -contains $args[0]) {`,
    `    if (Test-Path '${hooks}') { . '${hooks}' }`,
    `  }`,
    `}`,
    END,
    "",
  ].join("\n");
}

function hasMarker(content) {
  return content.includes(BEGIN) && content.includes(END);
}

function upsertBlock(filePath, block) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  let content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";

  if (hasMarker(content)) {
    const re = new RegExp(
      `${escapeRegExp(BEGIN)}[\\s\\S]*?${escapeRegExp(END)}\\n?`,
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
  ensureDpinDir();
  fs.mkdirSync(binDir(), { recursive: true });

  const cli = cliJsPath();
  const wrapper = [
    "@echo off",
    "setlocal",
    "set DPIN_SHELL=1",
    `node "${cli}" %*`,
    "set \"_dpin_ec=%ERRORLEVEL%\"",
    'if /I "%~1"=="add" goto :dpin_reload',
    'if /I "%~1"=="remove" goto :dpin_reload',
    'if /I "%~1"=="rm" goto :dpin_reload',
    'if /I "%~1"=="init" goto :dpin_reload',
    "exit /b %_dpin_ec%",
    ":dpin_reload",
    'call "%USERPROFILE%\\.dpin\\hooks.cmd"',
    "exit /b %_dpin_ec%",
    "",
  ].join("\r\n");
  fs.writeFileSync(wrapperCmdPath(), wrapper, "utf8");

  const autorun = [
    "@echo off",
    'set "PATH=%USERPROFILE%\\.dpin\\bin;%PATH%"',
    'if exist "%USERPROFILE%\\.dpin\\hooks.cmd" call "%USERPROFILE%\\.dpin\\hooks.cmd"',
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
    lower.includes(".dpin\\autorun.cmd") ||
    lower.includes(".dpin/autorun.cmd")
  ) {
    return;
  }

  // Upgrade old hooks.cmd-only AutoRun
  if (
    /\.dpin[/\\]hooks\.cmd/i.test(current) &&
    !current.includes("&")
  ) {
    writeAutoRun(quoted);
    return;
  }

  if (/\.dpin[/\\]hooks\.cmd/i.test(current)) {
    const updated = current.replace(
      /"?[^"&]*\.dpin[/\\]hooks\.cmd"?/gi,
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
  ensureDpinDir();
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
  ensureDpinDir();
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

/** Source line for bash/zsh — use: eval "$(dpin shellenv)" */
export function shellenvLine() {
  const sh = hooksShPath().replace(/\\/g, "/");
  return `. "${sh}"`;
}

export function shellenvPs1Line() {
  const hooks = hooksPs1Path();
  return `. '${hooks.replace(/'/g, "''")}'`;
}

/**
 * Hint only when not already inside shell wrapper (DPIN_SHELL=1).
 * Wrapper re-sources hooks after mutate — no manual reload.
 */
export function reloadHint() {
  if (process.env.DPIN_SHELL === "1") return null;

  if (process.platform === "win32") {
    return (
      "Load pins in THIS shell once:  . $HOME\\.dpin\\hooks.ps1  (PowerShell)  |  " +
      "%USERPROFILE%\\.dpin\\hooks.cmd  (cmd)  |  source ~/.dpin/hooks.sh  (bash). " +
      "Later `dpin add/remove` auto-reloads (use `dpin`, not `npx dirpin`)."
    );
  }
  return (
    "Load pins in THIS shell once:  eval \"$(dpin shellenv)\"  or  source ~/.dpin/hooks.sh. " +
    "Later `dpin add/remove` auto-reloads (use `dpin`, not `npx dirpin`)."
  );
}

export function printReloadHint() {
  const hint = reloadHint();
  if (hint) console.log(hint);
}
