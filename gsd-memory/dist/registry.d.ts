export interface RegisteredProject {
    name: string;
    path: string;
    qmdCollection?: string;
    registeredAt: string;
    lastIndexed?: string;
}
export interface Registry {
    version: string;
    projects: RegisteredProject[];
}
/**
 * Read the project registry
 */
export declare function readRegistry(): Registry;
/**
 * Write the project registry
 */
export declare function writeRegistry(registry: Registry): void;
/**
 * Register a new project
 */
export declare function registerProject(project: Omit<RegisteredProject, 'registeredAt'>): RegisteredProject;
/**
 * Update a project's last indexed time
 */
export declare function updateProjectIndexTime(name: string): void;
/**
 * Get a project by name
 */
export declare function getProject(name: string): RegisteredProject | undefined;
/**
 * Get all registered projects
 */
export declare function getAllProjects(): RegisteredProject[];
/**
 * Remove a project from the registry
 */
export declare function unregisterProject(name: string): boolean;
/**
 * Get the registry path (for testing)
 */
export declare function getRegistryPath(): string;
//# sourceMappingURL=registry.d.ts.map