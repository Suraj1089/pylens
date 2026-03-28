"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// PyPI/OSV Fetcher — Version, license, maintenance, and vulnerability data
// ─────────────────────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCache = clearCache;
exports.fetchLatestVersion = fetchLatestVersion;
exports.fetchVulnerabilities = fetchVulnerabilities;
exports.fetchAllVersions = fetchAllVersions;
const https = __importStar(require("https"));
const vscode = __importStar(require("vscode"));
const versions_1 = require("./versions");
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const OSV_BATCH_SIZE = 100;
/** In-memory session cache for package metadata and vulnerabilities */
const versionCache = new Map();
const latestVulnerabilityCache = new Map();
const vulnerabilityCache = new Map();
const latestInFlight = new Map();
const vulnerabilityInFlight = new Map();
/** Clear the session cache */
function clearCache() {
    versionCache.clear();
    latestVulnerabilityCache.clear();
    vulnerabilityCache.clear();
    latestInFlight.clear();
    vulnerabilityInFlight.clear();
}
function getTimeout(timeoutMs) {
    return timeoutMs ?? vscode.workspace.getConfiguration("pylens").get("timeout", 10000);
}
function getCacheTtlMs() {
    const ttl = vscode.workspace.getConfiguration("pylens").get("cacheTtlMs", DEFAULT_CACHE_TTL_MS);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_CACHE_TTL_MS;
}
function getVulnerabilityMode() {
    const raw = vscode.workspace.getConfiguration("pylens").get("vulnerabilityMode", "all");
    return raw === "all" || raw === "outdated-only" || raw === "off" ? raw : "all";
}
function readCache(cache, key) {
    const entry = cache.get(key);
    if (!entry) {
        return null;
    }
    if (entry.expiresAt <= Date.now()) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}
function writeCache(cache, key, value) {
    cache.set(key, {
        value,
        expiresAt: Date.now() + getCacheTtlMs(),
    });
}
function vulnerabilityKey(packageName, version) {
    return `${packageName.toLowerCase()}@${version}`;
}
function requestJson(url, timeout, method = "GET", body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, {
            method,
            headers: {
                "User-Agent": "vscode-pylens/1.0",
                ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
            },
        }, (res) => {
            if (res.statusCode === 404) {
                reject(new Error("Not found"));
                return;
            }
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                if (!data.trim()) {
                    resolve({});
                    return;
                }
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error("Failed to parse JSON response"));
                }
            });
        });
        req.on("error", reject);
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error(`Request timed out after ${timeout}ms`));
        });
        if (body) {
            req.write(body);
        }
        req.end();
    });
}
function normalizeVulnerability(v) {
    if (!v || typeof v !== "object") {
        return null;
    }
    const item = v;
    const aliases = Array.isArray(item.aliases)
        ? item.aliases.filter((a) => typeof a === "string")
        : [];
    const id = (typeof item.id === "string" && item.id.trim()) ||
        aliases[0] ||
        "Unidentified";
    const summary = (typeof item.summary === "string" && item.summary.trim()) ||
        (typeof item.details === "string" && item.details.trim()) ||
        (typeof item.source === "string" && item.source.trim()) ||
        "No description provided.";
    const fixedInRaw = Array.isArray(item.fixed_in)
        ? item.fixed_in
        : Array.isArray(item.fixedIn)
            ? item.fixedIn
            : [];
    const fixedIn = fixedInRaw.filter((x) => typeof x === "string");
    const link = typeof item.link === "string" ? item.link : undefined;
    return { id, summary, link, fixedIn };
}
function parseVulnerabilities(payload) {
    const rawVulns = payload.vulnerabilities;
    return Array.isArray(rawVulns)
        ? rawVulns
            .map(normalizeVulnerability)
            .filter((v) => v !== null)
        : [];
}
function parseLicense(payload) {
    const info = payload.info;
    const expression = typeof info?.license_expression === "string" ? info.license_expression.trim() : "";
    if (expression) {
        return expression;
    }
    const plain = typeof info?.license === "string" ? info.license.trim() : "";
    if (plain && plain.toUpperCase() !== "UNKNOWN") {
        return plain;
    }
    const classifiers = Array.isArray(info?.classifiers)
        ? info.classifiers.filter((c) => typeof c === "string")
        : [];
    const licenseClassifier = classifiers.find((c) => c.startsWith("License ::"));
    if (!licenseClassifier) {
        return null;
    }
    const extracted = licenseClassifier.split("::").pop()?.trim() ?? "";
    return extracted || null;
}
function parseLatestReleaseDate(payload) {
    const urls = payload.urls;
    const directTimes = Array.isArray(urls)
        ? urls
            .map((u) => (typeof u.upload_time_iso_8601 === "string" ? Date.parse(u.upload_time_iso_8601) : NaN))
            .filter((t) => Number.isFinite(t))
        : [];
    if (directTimes.length > 0) {
        return new Date(Math.max(...directTimes)).toISOString();
    }
    const releases = payload.releases;
    if (!releases || typeof releases !== "object") {
        return null;
    }
    let latestMs = Number.NaN;
    for (const files of Object.values(releases)) {
        if (!Array.isArray(files)) {
            continue;
        }
        for (const f of files) {
            const parsed = typeof f.upload_time_iso_8601 === "string" ? Date.parse(f.upload_time_iso_8601) : Number.NaN;
            if (Number.isFinite(parsed) && (Number.isNaN(latestMs) || parsed > latestMs)) {
                latestMs = parsed;
            }
        }
    }
    return Number.isFinite(latestMs) ? new Date(latestMs).toISOString() : null;
}
function computeMaintenanceStatus(latestVersion, latestReleaseDate) {
    if (!latestVersion) {
        return "unknown";
    }
    if (/^0\./.test(latestVersion)) {
        return "unstable";
    }
    if (!latestReleaseDate) {
        return "unknown";
    }
    const releaseMs = Date.parse(latestReleaseDate);
    if (!Number.isFinite(releaseMs)) {
        return "unknown";
    }
    const ageMs = Date.now() - releaseMs;
    const twoYearsMs = 1000 * 60 * 60 * 24 * 365 * 2;
    return ageMs > twoYearsMs ? "stale" : "active";
}
function normalizeOsvVulnerability(v) {
    if (!v || typeof v !== "object") {
        return null;
    }
    const vuln = v;
    const aliases = Array.isArray(vuln.aliases)
        ? vuln.aliases.filter((a) => typeof a === "string")
        : [];
    const preferredAlias = aliases.find((a) => a.startsWith("CVE-"));
    const id = preferredAlias ||
        (typeof vuln.id === "string" && vuln.id.trim()) ||
        aliases[0] ||
        "Unidentified";
    const summary = (typeof vuln.summary === "string" && vuln.summary.trim()) ||
        (typeof vuln.details === "string" && vuln.details.trim().slice(0, 280)) ||
        "Reported by OSV.";
    const refs = Array.isArray(vuln.references)
        ? vuln.references.filter((r) => !!r && typeof r === "object")
        : [];
    const link = refs
        .map((r) => (typeof r.url === "string" ? r.url : ""))
        .find((u) => !!u);
    const fixedIn = [];
    if (Array.isArray(vuln.affected)) {
        for (const affected of vuln.affected) {
            if (!affected || typeof affected !== "object") {
                continue;
            }
            const ranges = affected.ranges;
            if (!Array.isArray(ranges)) {
                continue;
            }
            for (const range of ranges) {
                if (!range || typeof range !== "object") {
                    continue;
                }
                const events = range.events;
                if (!Array.isArray(events)) {
                    continue;
                }
                for (const event of events) {
                    if (!event || typeof event !== "object") {
                        continue;
                    }
                    const fixed = event.fixed;
                    if (typeof fixed === "string" && fixed.trim()) {
                        fixedIn.push(fixed.trim());
                    }
                }
            }
        }
    }
    return {
        id,
        summary,
        link,
        fixedIn: [...new Set(fixedIn)],
    };
}
function parseOsvResult(payload) {
    const raw = payload.vulns;
    if (!Array.isArray(raw)) {
        return [];
    }
    return raw
        .map(normalizeOsvVulnerability)
        .filter((v) => v !== null);
}
function mergeVulnerabilities(primary, secondary) {
    const map = new Map();
    for (const v of [...primary, ...secondary]) {
        const key = v.id.trim().toLowerCase();
        if (!map.has(key)) {
            map.set(key, v);
        }
    }
    return [...map.values()];
}
function chunk(items, size) {
    if (size <= 0) {
        return [items];
    }
    const out = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}
async function fetchLatestInfo(packageName, timeoutMs) {
    const packageKey = packageName.toLowerCase();
    const cachedLatest = readCache(versionCache, packageKey);
    const cachedLatestInfo = readCache(latestVulnerabilityCache, packageKey);
    if (cachedLatestInfo && cachedLatestInfo.latest === cachedLatest) {
        return cachedLatestInfo;
    }
    const inFlight = latestInFlight.get(packageKey);
    if (inFlight) {
        return inFlight;
    }
    const requestPromise = (async () => {
        const timeout = getTimeout(timeoutMs);
        const url = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`;
        const payload = await requestJson(url, timeout);
        const latest = payload.info?.version;
        if (typeof latest !== "string" || latest.trim().length === 0) {
            throw new Error("PyPI response missing latest version");
        }
        const vulnerabilities = parseVulnerabilities(payload);
        const license = parseLicense(payload);
        const latestReleaseDate = parseLatestReleaseDate(payload);
        const latestInfo = {
            latest,
            vulnerabilities,
            license,
            latestReleaseDate,
        };
        writeCache(versionCache, packageKey, latest);
        writeCache(latestVulnerabilityCache, packageKey, latestInfo);
        writeCache(vulnerabilityCache, vulnerabilityKey(packageKey, latest), vulnerabilities);
        return latestInfo;
    })();
    latestInFlight.set(packageKey, requestPromise);
    try {
        return await requestPromise;
    }
    finally {
        latestInFlight.delete(packageKey);
    }
}
/** Fetch the latest version of a single package from PyPI */
async function fetchLatestVersion(packageName, timeoutMs) {
    const latestInfo = await fetchLatestInfo(packageName, timeoutMs);
    return latestInfo.latest;
}
async function fetchOsvVulnerabilities(packageName, version, timeoutMs) {
    const timeout = getTimeout(timeoutMs);
    const body = JSON.stringify({
        package: { name: packageName, ecosystem: "PyPI" },
        version,
    });
    const payload = await requestJson("https://api.osv.dev/v1/query", timeout, "POST", body);
    return parseOsvResult(payload);
}
async function fetchOsvBatchVulnerabilities(queries, timeoutMs) {
    const byKey = new Map();
    if (queries.length === 0) {
        return byKey;
    }
    const timeout = getTimeout(timeoutMs);
    for (const batch of chunk(queries, OSV_BATCH_SIZE)) {
        const body = JSON.stringify({
            queries: batch.map((q) => ({
                package: { name: q.name, ecosystem: "PyPI" },
                version: q.version,
            })),
        });
        const payload = await requestJson("https://api.osv.dev/v1/querybatch", timeout, "POST", body);
        const results = payload.results;
        if (!Array.isArray(results)) {
            for (const q of batch) {
                byKey.set(vulnerabilityKey(q.name, q.version), []);
            }
            continue;
        }
        batch.forEach((q, index) => {
            const resultPayload = results[index] ?? {};
            const parsed = parseOsvResult(resultPayload);
            byKey.set(vulnerabilityKey(q.name, q.version), parsed);
        });
    }
    return byKey;
}
/** Fetch known vulnerabilities for a specific package version */
async function fetchVulnerabilities(packageName, version, timeoutMs) {
    const cacheKey = vulnerabilityKey(packageName, version);
    const cached = readCache(vulnerabilityCache, cacheKey);
    if (cached) {
        return cached;
    }
    const latestInfo = readCache(latestVulnerabilityCache, packageName.toLowerCase());
    if (latestInfo && latestInfo.latest === version) {
        return latestInfo.vulnerabilities;
    }
    const inFlight = vulnerabilityInFlight.get(cacheKey);
    if (inFlight) {
        return inFlight;
    }
    const requestPromise = (async () => {
        const timeout = getTimeout(timeoutMs);
        const pypiUrl = `https://pypi.org/pypi/${encodeURIComponent(packageName)}/${encodeURIComponent(version)}/json`;
        const [pypiResult, osvResult] = await Promise.allSettled([
            requestJson(pypiUrl, timeout),
            fetchOsvVulnerabilities(packageName, version, timeout),
        ]);
        const pypiVulns = pypiResult.status === "fulfilled"
            ? parseVulnerabilities(pypiResult.value)
            : [];
        const osvVulns = osvResult.status === "fulfilled"
            ? osvResult.value
            : [];
        if (pypiResult.status === "rejected" &&
            osvResult.status === "rejected") {
            throw new Error(`Failed to fetch vulnerabilities for ${packageName}@${version}`);
        }
        const merged = mergeVulnerabilities(pypiVulns, osvVulns);
        writeCache(vulnerabilityCache, cacheKey, merged);
        return merged;
    })();
    vulnerabilityInFlight.set(cacheKey, requestPromise);
    try {
        return await requestPromise;
    }
    finally {
        vulnerabilityInFlight.delete(cacheKey);
    }
}
/**
 * Semaphore for concurrency control.
 * Limits the number of simultaneous package metadata requests.
 */
class Semaphore {
    constructor(limit) {
        this.limit = limit;
        this.queue = [];
        this.running = 0;
    }
    async acquire() {
        if (this.running < this.limit) {
            this.running++;
            return;
        }
        return new Promise((resolve) => {
            this.queue.push(() => {
                this.running++;
                resolve();
            });
        });
    }
    release() {
        this.running--;
        const next = this.queue.shift();
        if (next) {
            next();
        }
    }
}
/**
 * Fetch package versions, health, and vulnerability data with concurrency control.
 * - 1 PyPI metadata request per package
 * - batched OSV vulnerability queries for pinned package versions
 */
async function fetchAllVersions(deps, onProgress) {
    const concurrency = vscode.workspace.getConfiguration("pylens").get("concurrency", 10);
    const vulnerabilityMode = getVulnerabilityMode();
    const semaphore = new Semaphore(concurrency);
    let completed = 0;
    const baseResults = await Promise.all(deps.map(async (dep) => {
        const pypiUrl = `https://pypi.org/project/${encodeURIComponent(dep.name)}/`;
        await semaphore.acquire();
        try {
            if (onProgress) {
                onProgress({ completed, total: deps.length, current: dep.name });
            }
            const latestInfo = await fetchLatestInfo(dep.name);
            const latest = latestInfo.latest;
            let status;
            if (!dep.version) {
                status = "unpinned";
            }
            else {
                status = (0, versions_1.compareVersions)(dep.version, latest) >= 0 ? "up-to-date" : "outdated";
            }
            return {
                dep,
                pypiUrl,
                latest,
                status,
                latestInfo,
            };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                dep,
                pypiUrl,
                latest: null,
                status: "error",
                latestInfo: null,
                error: msg,
            };
        }
        finally {
            completed++;
            semaphore.release();
        }
    }));
    // Prepare batched OSV vulnerability queries for pinned versions not already cached.
    const pendingVulnQueries = new Map();
    if (vulnerabilityMode !== "off") {
        for (const item of baseResults) {
            const version = item.dep.version;
            if (!version) {
                continue;
            }
            if (vulnerabilityMode === "outdated-only" && item.status !== "outdated") {
                continue;
            }
            const key = vulnerabilityKey(item.dep.name, version);
            const cached = readCache(vulnerabilityCache, key);
            if (cached !== null) {
                continue;
            }
            if (!pendingVulnQueries.has(key)) {
                pendingVulnQueries.set(key, { name: item.dep.name, version });
            }
        }
        if (pendingVulnQueries.size > 0) {
            try {
                const fetched = await fetchOsvBatchVulnerabilities([...pendingVulnQueries.values()]);
                for (const [key, vulns] of fetched.entries()) {
                    writeCache(vulnerabilityCache, key, vulns);
                }
            }
            catch {
                // If OSV batch request fails, we keep scan results usable and fall back to PyPI-only data.
            }
        }
    }
    return baseResults.map((item) => {
        const latest = item.latest;
        const license = item.latestInfo?.license ?? null;
        const latestReleaseDate = item.latestInfo?.latestReleaseDate ?? null;
        const maintenance = computeMaintenanceStatus(latest, latestReleaseDate);
        let vulnerabilities = null;
        if (item.dep.version && vulnerabilityMode !== "off") {
            if (vulnerabilityMode === "outdated-only" && item.status !== "outdated") {
                vulnerabilities = null;
            }
            else {
                const cachedVulns = readCache(vulnerabilityCache, vulnerabilityKey(item.dep.name, item.dep.version));
                const pypiLatestVulns = item.latestInfo && item.latestInfo.latest === item.dep.version
                    ? item.latestInfo.vulnerabilities
                    : [];
                if (cachedVulns !== null) {
                    vulnerabilities = mergeVulnerabilities(cachedVulns, pypiLatestVulns);
                }
                else if (pypiLatestVulns.length > 0) {
                    vulnerabilities = pypiLatestVulns;
                }
                else {
                    vulnerabilities = null;
                }
            }
        }
        return {
            ...item.dep,
            latest,
            status: item.status,
            pypiUrl: item.pypiUrl,
            license,
            maintenance,
            latestReleaseDate,
            vulnerabilities,
            ...(item.error ? { error: item.error } : {}),
        };
    });
}
//# sourceMappingURL=pypi.js.map