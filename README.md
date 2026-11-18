# dirpin

Pin directories as short shell aliases. Type `a` or `b` to `cd` there.

Works with **bash**, **zsh**, **PowerShell**, and **cmd**.

## Install

```bash
npm i -g dirpin
# also on PATH: dpin, dpn (aliases)
```

## Usage

```bash
# pin current directory as "a"
dirpin add a

# pin a path as "b"
dirpin add b /some/path

# list / remove / print path
dirpin list
dirpin remove a
dirpin path b

# repair hooks
dirpin init
```

`dpin` and `dpn` are short aliases for the same CLI.

First `dirpin add` writes `~/.dirpin/` and patches shell profiles (cmd AutoRun on Windows).

## No restart after add/remove

A Node process cannot `cd` or `source` its parent shell. So dirpin installs **shell wrappers** for `dirpin`, `dpin`, and `dpn`:

1. Runs the real CLI
2. After `add` / `remove` / `init`, re-sources hooks in **this** session

Use `dirpin` (or `dpin` / `dpn`) after `npm i -g dirpin`, not `npx dirpin`, so the wrapper runs.

**First time in a shell that does not have the wrapper yet** — load once:

```bash
eval "$(dirpin shellenv)"          # bash / zsh
. $HOME\.dirpin\hooks.ps1          # PowerShell
%USERPROFILE%\.dirpin\hooks.cmd    # cmd
```

After that, further `dirpin add` / `remove` update aliases immediately.

## How it works

Pins live in `~/.dirpin/pins.json`. Hook files define shell functions (or `doskey` for cmd). Profile (or cmd `autorun.cmd`) loads them and wraps `dirpin` / `dpin` / `dpn` for auto-reload.

