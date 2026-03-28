// ─────────────────────────────────────────────────────────────────────────────
// Parsers — Parse dependency files across all Python project formats
// ─────────────────────────────────────────────────────────────────────────────

import { ParsedDep, DepKind, SourceFormat } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise package name: lowercase, replace [-_.] with single - */
export function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, "-");
}

/** Extract pinned version from specifier like "==4.2.7" → "4.2.7", ">=2.0" → null */
export function extractPinned(spec: string): string | null {
  const m = /^==([^\s,;]+)/.exec(spec.trim());
  return m ? m[1] : null;
}

// ── requirements*.txt ────────────────────────────────────────────────────────

const REQ_LINE_RE = /^([A-Za-z0-9_\-\.]+)\s*([><=!~^,\s0-9.*a-zA-Z]*)?/;

export function parseRequirementsTxt(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim().split("#")[0].trim();
    if (!line || line.startsWith("-") || line.startsWith(".") || line.startsWith("http")) {
      continue;
    }

    const m = REQ_LINE_RE.exec(line);
    if (!m) { continue; }

    const name = m[1];
    const rawSpec = (m[2] || "").trim();
    deps.push({
      name,
      rawSpec: rawSpec || "*",
      version: extractPinned(rawSpec),
      kind: "direct",
    });
  }

  return deps;
}

// ── pyproject.toml (PEP 621) ─────────────────────────────────────────────────

export function parsePEP621(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];

  const mainDepsMatch = content.match(
    /\[project\][^[]*?dependencies\s*=\s*\[([\s\S]*?)\]/m
  );
  if (mainDepsMatch) {
    parseDepArray(mainDepsMatch[1], "direct", deps);
  }

  const optionalSection = content.match(
    /\[project\.optional-dependencies\]([\s\S]*?)(?=\n\[|\Z)/m
  );
  if (optionalSection) {
    const section = optionalSection[1];
    const blockRe = /\w+\s*=\s*\[([\s\S]*?)\]/gm;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(section)) !== null) {
      parseDepArray(bm[1], "optional", deps);
    }
  }

  return deps;
}

export function parseDepArray(block: string, kind: DepKind, out: ParsedDep[]): void {
  const itemRe = /"([^"]+)"|'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(block)) !== null) {
    const raw = (m[1] || m[2]).trim();
    if (!raw || raw.startsWith("#")) { continue; }
    const parsed = /^([A-Za-z0-9_\-\.]+)(?:\[[^\]]+\])?\s*(.*)$/.exec(raw);
    if (!parsed) { continue; }
    const name = parsed[1];
    const rawSpec = parsed[2].trim();
    if (normaliseName(name) === "python") { continue; }
    out.push({ name, rawSpec: rawSpec || "*", version: extractPinned(rawSpec), kind });
  }
}

// ── pyproject.toml (Poetry) ──────────────────────────────────────────────────

export function parsePoetry(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];

  const sections: Array<{ re: RegExp; kind: DepKind }> = [
    { re: /\[tool\.poetry\.dependencies\]([\s\S]*?)(?=\n\[|\Z)/m, kind: "direct" },
    { re: /\[tool\.poetry\.dev-dependencies\]([\s\S]*?)(?=\n\[|\Z)/m, kind: "dev" },
    { re: /\[tool\.poetry\.group\.\w+\.dependencies\]([\s\S]*?)(?=\n\[|\Z)/gm, kind: "dev" },
  ];

  for (const { re, kind } of sections) {
    const matches = content.matchAll(new RegExp(re.source, "gm"));
    for (const sm of matches) {
      parsePoetrySection(sm[1], kind, deps);
    }
  }

  return deps;
}

export function parsePoetrySection(block: string, kind: DepKind, out: ParsedDep[]): void {
  const lineRe = /^([A-Za-z0-9_\-\.]+)\s*=\s*(.+)$/gm;
  let m: RegExpExecArray | null;

  while ((m = lineRe.exec(block)) !== null) {
    const name = m[1].trim();
    if (normaliseName(name) === "python") { continue; }

    let rawSpec = m[2].trim();
    let version: string | null = null;

    if (rawSpec.startsWith("{")) {
      const vm = rawSpec.match(/version\s*=\s*"([^"]+)"/);
      rawSpec = vm ? vm[1] : "*";
    } else {
      rawSpec = rawSpec.replace(/^"|"$/g, "").trim();
    }

    version = /^\d/.test(rawSpec) ? rawSpec : null;

    out.push({ name, rawSpec, version, kind });
  }
}

// ── pyproject.toml (PDM) ─────────────────────────────────────────────────────

export function parsePDM(content: string): ParsedDep[] {
  const deps = parsePEP621(content);

  const devSection = content.match(
    /\[tool\.pdm\.dev-dependencies\]([\s\S]*?)(?=\n\[|\Z)/m
  );
  if (devSection) {
    const blockRe = /\w+\s*=\s*\[([\s\S]*?)\]/gm;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(devSection[1])) !== null) {
      parseDepArray(bm[1], "dev", deps);
    }
  }

  return deps;
}

// ── uv.lock ──────────────────────────────────────────────────────────────────

export function parseUvLock(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  const packageBlocks = content.split(/\n(?=\[\[package\]\])/);

  for (const block of packageBlocks) {
    if (!block.includes("[[package]]")) { continue; }

    const nameMatch = block.match(/^name\s*=\s*"([^"]+)"/m);
    const versionMatch = block.match(/^version\s*=\s*"([^"]+)"/m);

    if (!nameMatch || !versionMatch) { continue; }

    const name = nameMatch[1];
    const version = versionMatch[1];

    if (normaliseName(name) === "python") { continue; }

    deps.push({
      name,
      rawSpec: `==${version}`,
      version,
      kind: "transitive",
    });
  }

  return deps;
}

// ── Pipfile ──────────────────────────────────────────────────────────────────

export function parsePipfile(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];

  const sections: Array<{ re: RegExp; kind: DepKind }> = [
    { re: /\[packages\]([\s\S]*?)(?=\n\[|\Z)/m, kind: "direct" },
    { re: /\[dev-packages\]([\s\S]*?)(?=\n\[|\Z)/m, kind: "dev" },
  ];

  for (const { re, kind } of sections) {
    const sm = re.exec(content);
    if (!sm) { continue; }

    const lineRe = /^([A-Za-z0-9_\-\.]+)\s*=\s*"([^"]*)"/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(sm[1])) !== null) {
      const name = m[1];
      const rawSpec = m[2].trim();
      if (normaliseName(name) === "python") { continue; }
      const version = rawSpec === "*" ? null : extractPinned(rawSpec);
      deps.push({ name, rawSpec: rawSpec || "*", version, kind });
    }
  }

  return deps;
}

// ── Pipfile.lock ─────────────────────────────────────────────────────────────

export function parsePipfileLock(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];

  let json: Record<string, Record<string, { version?: string }>>;
  try {
    json = JSON.parse(content);
  } catch {
    return deps;
  }

  const sections: Array<{ key: string; kind: DepKind }> = [
    { key: "default", kind: "direct" },
    { key: "develop", kind: "dev" },
  ];

  for (const { key, kind } of sections) {
    const section = json[key];
    if (!section || typeof section !== "object") { continue; }

    for (const [name, info] of Object.entries(section)) {
      if (name === "_meta") { continue; }
      if (normaliseName(name) === "python") { continue; }

      const rawSpec = info?.version ?? "*";
      const version = extractPinned(rawSpec);
      deps.push({ name, rawSpec, version, kind });
    }
  }

  return deps;
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export function parseDependencyFile(content: string, format: SourceFormat): ParsedDep[] {
  switch (format) {
    case "requirements.txt":
    case "requirements.in":
      return parseRequirementsTxt(content);
    case "pyproject.toml (PEP 621)":
      return parsePEP621(content);
    case "pyproject.toml (Poetry)":
      return parsePoetry(content);
    case "pyproject.toml (PDM)":
      return parsePDM(content);
    case "uv.lock":
      return parseUvLock(content);
    case "Pipfile":
      return parsePipfile(content);
    case "Pipfile.lock":
      return parsePipfileLock(content);
    default:
      return [];
  }
}
