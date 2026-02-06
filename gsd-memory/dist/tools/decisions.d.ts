export interface DecisionResult {
    decision: string;
    rationale?: string;
    project: string;
    phase?: string;
    source: string;
    date?: string;
    tags?: string[];
}
export interface DecisionOptions {
    query?: string;
    project?: string;
    tags?: string[];
    limit?: number;
}
/**
 * Search for decisions across all registered GSD projects
 */
export declare function findDecisions(options: DecisionOptions): Promise<DecisionResult[]>;
//# sourceMappingURL=decisions.d.ts.map