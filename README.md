# dpin

Pin directories as short shell aliases. Type `a` or `b` to `cd` there.

Works with **bash**, **zsh**, **PowerShell**, and **cmd**.

## Install

```bash
npm i -g dirpin
# command on PATH is still: dpin
```

## Usage

```bash
# pin current directory as "a"
dpin add a

# pin a path as "b"
dpin add b /some/path

# list / remove / print path
dpin list
dpin remove a
dpin path b

# repair hooks
dpin init
```

First `dpin add` writes `~/.dpin/` and patches shell profiles (cmd AutoRun on Windows).

## No restart after add/remove

A Node process cannot `cd` or `source` its parent shell. So dpin installs a **shell wrapper** named `dpin`:

1. Runs the real CLI
2. After `add` / `remove` / `init`, re-sources hooks in **this** session

Use the command `dpin` (after `npm i -g dirpin`), not `npx dirpin`, so the wrapper runs.

**First time in a shell that does not have the wrapper yet** — load once:

```bash
eval "$(dpin shellenv)"          # bash / zsh
. $HOME\.dpin\hooks.ps1          # PowerShell
%USERPROFILE%\.dpin\hooks.cmd    # cmd
```

After that, further `dpin add` / `remove` update aliases immediately.

## How it works

Pins live in `~/.dpin/pins.json`. Hook files define shell functions (or `doskey` for cmd). Profile (or cmd `autorun.cmd`) loads them and wraps `dpin` for auto-reload.
