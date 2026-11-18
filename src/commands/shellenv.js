import { shellenvLine, shellenvPs1Line } from "../install.js";

export function cmdShellenv(args) {
  const shell = (args[0] || "").toLowerCase();
  if (shell === "powershell" || shell === "pwsh" || shell === "ps1") {
    console.log(shellenvPs1Line());
    return;
  }
  if (shell === "cmd") {
    console.log(`call "%USERPROFILE%\\.dpin\\hooks.cmd"`);
    return;
  }
  // bash / zsh / default — eval "$(dpin shellenv)"
  console.log(shellenvLine());
}
