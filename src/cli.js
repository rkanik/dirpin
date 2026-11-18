#!/usr/bin/env node
import { cmdAdd } from "./commands/add.js";
import { cmdInit } from "./commands/init.js";
import { cmdList } from "./commands/list.js";
import { cmdPath } from "./commands/path.js";
import { cmdRemove } from "./commands/remove.js";
import { cmdShellenv } from "./commands/shellenv.js";

const HELP = `dpin — pin directories as shell aliases

Usage:
  dpin add <alias> [path] [--force]   Pin alias to path (default: cwd)
  dpin list                           List pins
  dpin remove <alias>                 Remove pin (alias: rm)
  dpin path <alias>                   Print pinned path
  dpin init [--shell <name>]          Install/repair shell hooks
  dpin shellenv [bash|powershell|cmd] Print source line for eval
  dpin help                           Show this help

Shells: bash, zsh, PowerShell, cmd
First add auto-installs hooks. Profile wraps \`dpin\` so add/remove
reloads pins in the current shell (no restart). One-time load:
  eval "$(dpin shellenv)"

Install: npm i -g dpin-cli
`;

function main() {
  const argv = process.argv.slice(2);
  const cmd = (argv[0] || "help").toLowerCase();
  const args = argv.slice(1);

  try {
    switch (cmd) {
      case "add":
        cmdAdd(args);
        break;
      case "list":
      case "ls":
        cmdList();
        break;
      case "remove":
      case "rm":
        cmdRemove(args);
        break;
      case "path":
        cmdPath(args);
        break;
      case "init":
        cmdInit(args);
        break;
      case "shellenv":
        cmdShellenv(args);
        break;
      case "help":
      case "-h":
      case "--help":
        console.log(HELP.trim());
        break;
      case "-v":
      case "--version":
      case "version":
        console.log("1.0.0");
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error("Run: dpin help");
        process.exitCode = 1;
    }
  } catch (err) {
    console.error(err.message || err);
    process.exitCode = 1;
  }
}

main();
