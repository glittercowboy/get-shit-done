export interface IndexOptions {
    path?: string;
    project?: string;
}
export interface IndexResult {
    success: boolean;
    project?: string;
    documentsIndexed?: number;
    error?: string;
    qmdUsed: boolean;
}
/**
 * Trigger indexing/update for a project
 */
export declare function index(options: IndexOptions): Promise<IndexResult>;
/**
 * Index all registered projects
 */
export declare function indexAll(): Promise<{
    success: boolean;
    results: IndexResult[];
}>;
//# sourceMappingURL=index-tool.d.ts.map