export interface StackResult {
    library: string;
    version?: string;
    purpose?: string;
    project: string;
    phase?: string;
    source: string;
    sourceType: 'summary' | 'research';
}
export interface StackOptions {
    query?: string;
    project?: string;
    limit?: number;
}
/**
 * Search for tech stack entries across all registered GSD projects
 */
export declare function findStack(options: StackOptions): Promise<StackResult[]>;
//# sourceMappingURL=stack.d.ts.map