export interface QmdSearchResult {
    content: string;
    source: string;
    relevance: number;
    context?: string;
}
export interface QmdSearchOptions {
    query: string;
    paths: string[];
    limit?: number;
    collection?: string;
}
export interface QmdCollectionOptions {
    name: string;
    paths: string[];
    context?: string;
}
export interface QmdResult {
    success: boolean;
    reason?: string;
    data?: unknown;
}
export interface QmdStatus {
    available: boolean;
    collection?: string;
    documentCount?: number;
    lastIndexed?: string;
}
/**
 * QMD wrapper - provides semantic search when QMD is available,
 * falls back to grep-based search otherwise
 */
export declare const qmd: {
    /**
     * Check if QMD is installed and available
     */
    isAvailable(): Promise<boolean>;
    /**
     * Search for content using QMD or grep fallback
     */
    search(options: QmdSearchOptions): Promise<QmdSearchResult[]>;
    /**
     * Search using QMD (when available)
     */
    qmdSearch(options: QmdSearchOptions): Promise<QmdSearchResult[]>;
    /**
     * Grep-based fallback search
     */
    grepFallback(options: QmdSearchOptions): Promise<QmdSearchResult[]>;
    /**
     * Find all markdown files in a directory recursively
     */
    findMarkdownFiles(dir: string, files?: string[]): string[];
    /**
     * Create a QMD collection for a project
     */
    createCollection(options: QmdCollectionOptions): Promise<QmdResult>;
    /**
     * Trigger reindexing of a collection
     */
    index(collectionName: string): Promise<QmdResult>;
    /**
     * Get status of a collection
     */
    status(collectionName: string): Promise<QmdStatus>;
};
//# sourceMappingURL=qmd.d.ts.map