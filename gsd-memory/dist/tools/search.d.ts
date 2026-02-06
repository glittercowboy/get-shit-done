export interface SearchResult {
    content: string;
    source: string;
    project: string;
    phase?: string;
    relevance: number;
    documentType?: 'summary' | 'research' | 'project' | 'plan' | 'other';
}
export interface SearchOptions {
    query: string;
    project?: string;
    tags?: string[];
    limit?: number;
}
/**
 * Search across all registered GSD projects
 */
export declare function search(options: SearchOptions): Promise<SearchResult[]>;
//# sourceMappingURL=search.d.ts.map