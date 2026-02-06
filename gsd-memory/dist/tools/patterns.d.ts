export interface PatternResult {
    pattern: string;
    project: string;
    phase: string;
    source: string;
    date?: string;
    tags?: string[];
}
export interface PatternOptions {
    query?: string;
    project?: string;
    tags?: string[];
    limit?: number;
}
/**
 * Search for patterns established across all registered GSD projects
 */
export declare function findPatterns(options: PatternOptions): Promise<PatternResult[]>;
//# sourceMappingURL=patterns.d.ts.map