# PyLens

[![Version](https://img.shields.io/github/package-json/v/Suraj1089/pylens?style=flat-square)](https://github.com/Suraj1089/pylens/blob/main/package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](https://github.com/Suraj1089/pylens/blob/main/LICENSE)
[![Open VSX](https://img.shields.io/open-vsx/v/pylens/pylens?style=flat-square)](https://open-vsx.org/extension/pylens/pylens)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/pylens/pylens?style=flat-square)](https://open-vsx.org/extension/pylens/pylens)
[![Open VSX Publish](https://img.shields.io/github/actions/workflow/status/Suraj1089/pylens/publish-open-vsx.yml?branch=main&label=open-vsx%20publish&style=flat-square)](https://github.com/Suraj1089/pylens/actions/workflows/publish-open-vsx.yml)

PyLens is a VS Code extension for Python dependency health and security.
It helps you find outdated packages, known vulnerabilities, license risk, and maintenance issues in one place, then update dependencies quickly from the editor.

PyLens is built for teams using `requirements.txt`, `requirements.in` (pip-tools), `pyproject.toml`, `uv.lock`, and Pipenv files who want faster dependency hygiene with less manual checking.

## Core Features

- outdated package detection with latest version from PyPI
- vulnerability insights from PyPI + OSV (with CVE/issue identifiers)
- license visibility for compliance-sensitive projects
- maintenance status (`active`, `stale`, `unstable`)
- row-level update actions + detailed side panel
- hover tooltips with Quick Update links inside dependency files
- `requirements.in` compilation flow support

## Open VSX Listing Copy

Use this in your Open VSX/Marketplace long description:

PyLens is a VS Code extension that continuously analyzes Python dependencies across `requirements.txt`, `requirements.in`, `pyproject.toml`, `uv.lock`, and Pipenv files. It highlights outdated packages, maps known vulnerabilities from OSV and PyPI, and surfaces license and maintenance signals so teams can make safer upgrade decisions quickly.

Designed for real project workflows, PyLens adds actionable update controls directly in the scan table, package detail panel, and hover tooltips. You can choose file-only updates or run terminal commands after updates, including pip-tools compile flows for `requirements.in` projects.

### Search Keywords

- python dependency scanner
- vscode python vulnerabilities
- pypi outdated checker
- osv vulnerability scanner
- python license compliance
- requirements.txt updater
- pip-tools requirements.in
- dependency health dashboard

## Snapshot

- outdated packages
- latest versions from PyPI
- known vulnerabilities (PyPI + OSV)
- package license information
- maintenance status (`active`, `stale`, `unstable`)

Supported files:

- `requirements*.txt`
- `requirements*.in`
- `pyproject.toml` (PEP 621 / Poetry / PDM)
- `uv.lock`
- `Pipfile`
- `Pipfile.lock`

## Security & Health Insights

PyLens now adds professional package risk context directly in the report table and detail panel:

- Vulnerability badges with warning indicator and CVE/issue IDs
- License column for quick compliance checks
- Maintenance status:
  - `unstable`: latest version starts with `0.x`
  - `stale`: no release in the last 2+ years
  - `active`: healthy release cadence

## Hover Quick Update

In `requirements*.txt`, `requirements*.in`, and `pyproject.toml`:

- hover a package name to see the latest version
- use **Quick Update** from the hover tooltip to update that dependency immediately

## Dependency Update Behavior

PyLens supports two update modes when you click an `Update` button or use Hover Quick Update.

### 1) File-only update (default)

Setting:

- `pylens.dependencyUpdateMode = "file-only"`

Behavior:

- only updates the dependency version in the file
- does not run terminal commands

### 2) File update + terminal command

Settings:

- `pylens.dependencyUpdateMode = "file-and-run-command"`
- `pylens.postUpdateCommand = "pip install -r ${dependencyFileRelative}"`

Behavior:

- updates dependency version in file
- then runs `pylens.postUpdateCommand` in a VS Code terminal

## requirements.in (pip-tools) Flow

For pip-tools workflows, PyLens can compile `.in` to `.txt` automatically after an update.

Settings:

- `pylens.requirementsInCompileOnUpdate = true`
- `pylens.requirementsInCompileCommand = "pip-compile ${dependencyFileRelative}"`

Behavior:

- when updating a `requirements.in` file in `file-and-run-command` mode, PyLens runs the compile command instead of the generic post-update install command

## Command Placeholders

Supported placeholders in `pylens.postUpdateCommand` and `pylens.requirementsInCompileCommand`:

- `${workspaceFolder}`
- `${dependencyFile}`
- `${dependencyFileRelative}`

## Command Palette

PyLens provides these manual commands:

- `PyLens: Scan Packages` (`pylens.check`)
- `PyLens: Refresh` (`pylens.refresh`)
- `PyLens: Select Dependency File` (`pylens.selectFile`)
- `PyLens: Export Results as JSON` (`pylens.exportJson`)
- `PyLens: Export Results as CSV` (`pylens.exportCsv`)
- `PyLens: Run Post-Update Command` (`pylens.runPostUpdateCommand`)
- `PyLens: Compile requirements.in` (`pylens.compileRequirementsIn`)

## Open VSX Auto Publish

This repo includes `.github/workflows/publish-open-vsx.yml` that:

- runs on every push to `main`/`master`
- compiles the extension
- publishes to Open VSX using `--skip-duplicate`
- prints the exact Open VSX extension URL in logs

### Required secret

Add this repository secret in GitHub:

- `OPEN_VSX_TOKEN` = your Open VSX personal access token

For local/manual use, you can keep a token in `.env` (excluded from git). See `.env.example`.

## Auto Version Bump

This repo also includes `.github/workflows/auto-bump-version.yml`.

Behavior:

- on pushes to `main`/`master` that modify extension-related files (`src/**`, `media/**`, `README.md`, `tsconfig.json`, `.vscodeignore`, `package.json`)
- automatically bumps `package.json` patch version (`x.y.z` -> `x.y.(z+1)`)
- commits and pushes the bumped `package.json` + `package-lock.json`

Important:

- ensure repository `Settings -> Actions -> General -> Workflow permissions` is set to **Read and write permissions**
