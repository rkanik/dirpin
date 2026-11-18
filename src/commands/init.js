import { ensureInstalled, printReloadHint } from "../install.js";

const ALLOWED = new Set(["bash", "zsh", "powershell", "pwsh", "cmd"]);

export function cmdInit(args) {
  let shells;
  const shellIdx = args.indexOf("--shell");
  if (shellIdx !== -1) {
    const name = (args[shellIdx + 1] || "").toLowerCase();
    if (!ALLOWED.has(name)) {
      throw new Error(
        `Unknown shell '${name}'. Use: bash, zsh, powershell, cmd`,
      );
    }
    shells = [name === "pwsh" ? "powershell" : name];
  }

  const { firstInstall, shells: applied } = ensureInstalled({ shells });
  console.log(
    firstInstall
      ? `Installed dirpin hooks (${applied.join(", ")})`
      : `Updated dirpin hooks (${applied.join(", ")})`,
  );
  printReloadHint();
}
