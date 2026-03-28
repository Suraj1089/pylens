"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// Version Comparison — Semantic version comparison utilities
// ─────────────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareVersions = compareVersions;
exports.getUpdateType = getUpdateType;
/**
 * Compare two version strings numerically.
 * Returns negative if a < b, positive if a > b, zero if equal.
 */
function compareVersions(a, b) {
    const parts = (v) => v.replace(/[^0-9.]/g, "").split(".").map((n) => parseInt(n) || 0);
    const ap = parts(a);
    const bp = parts(b);
    const len = Math.max(ap.length, bp.length);
    for (let i = 0; i < len; i++) {
        const d = (ap[i] || 0) - (bp[i] || 0);
        if (d !== 0) {
            return d;
        }
    }
    return 0;
}
/**
 * Format a version difference as a human-readable string.
 * e.g. "2.0.0 → 3.1.0" = "major update", "2.0.0 → 2.1.0" = "minor update"
 */
function getUpdateType(current, latest) {
    const cParts = current.replace(/[^0-9.]/g, "").split(".").map((n) => parseInt(n) || 0);
    const lParts = latest.replace(/[^0-9.]/g, "").split(".").map((n) => parseInt(n) || 0);
    if ((lParts[0] || 0) > (cParts[0] || 0)) {
        return "major";
    }
    if ((lParts[1] || 0) > (cParts[1] || 0)) {
        return "minor";
    }
    if ((lParts[2] || 0) > (cParts[2] || 0)) {
        return "patch";
    }
    return "unknown";
}
//# sourceMappingURL=versions.js.map