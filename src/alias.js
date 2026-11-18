const RESERVED = new Set([
  "dirpin",
  "dpin",
  "dpn",
  "cd",
  "ls",
  "dir",
  "pwd",
  "exit",
  "quit",
  "set",
  "export",
  "alias",
  "unalias",
  "source",
  "echo",
  "type",
  "which",
  "where",
  "help",
  "cls",
  "clear",
  "md",
  "mkdir",
  "rd",
  "rmdir",
  "del",
  "rm",
  "copy",
  "cp",
  "move",
  "mv",
  "ren",
  "pushd",
  "popd",
  "path",
  "call",
  "start",
  "cmd",
  "powershell",
  "pwsh",
  "bash",
  "zsh",
  "fish",
  "node",
  "npm",
  "npx",
  "git",
  "code",
]);

const ALIAS_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function validateAlias(alias) {
  if (!alias || typeof alias !== "string") {
    throw new Error("Alias required");
  }
  if (!ALIAS_RE.test(alias)) {
    throw new Error(
      `Invalid alias '${alias}'. Use letters, numbers, _ or -; start with a letter.`,
    );
  }
  if (RESERVED.has(alias.toLowerCase())) {
    throw new Error(`Alias '${alias}' is reserved`);
  }
  return alias;
}
