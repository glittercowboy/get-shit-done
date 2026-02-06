export interface ProjectStatus {
    name: string;
    path: string;
    exists: boolean;
    hasPlanningDir: boolean;
    qmdCollection?: string;
    qmdAvailable: boolean;
    documentCount: number;
    registeredAt: string;
    lastIndexed?: string;
}
export interface MemoryStatus {
    qmdAvailable: boolean;
    qmdVersion?: string;
    totalProjects: number;
    totalDocuments: number;
    projects: ProjectStatus[];
}
/**
 * Get comprehensive status of GSD memory system
 */
export declare function getStatus(): Promise<MemoryStatus>;
//# sourceMappingURL=status.d.ts.map