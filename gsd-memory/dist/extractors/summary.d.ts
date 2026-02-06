export interface TechStackEntry {
    library: string;
    version: string;
    purpose?: string;
}
export interface Dependency {
    phase: string;
    provides: string;
}
export interface KeyFiles {
    created: string[];
    modified: string[];
}
export interface Decision {
    decision: string;
    source?: string;
}
export interface SummaryData {
    phase: string;
    plan: number | string;
    subsystem: string;
    tags: string[];
    requires: Dependency[];
    provides: string[];
    affects: string[];
    techStack: TechStackEntry[];
    patterns: string[];
    keyFiles: KeyFiles;
    decisions: Decision[];
    duration: string;
    completed: string;
    oneLiner: string;
}
/**
 * Extract structured data from a SUMMARY.md file
 */
export declare function extractSummary(markdown: string): SummaryData;
//# sourceMappingURL=summary.d.ts.map