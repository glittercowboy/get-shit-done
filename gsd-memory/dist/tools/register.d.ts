import { type RegisteredProject } from '../registry.js';
export interface RegisterOptions {
    path: string;
    name?: string;
}
export interface RegisterResult {
    success: boolean;
    project?: RegisteredProject;
    qmdCollection?: string;
    error?: string;
}
/**
 * Register a project with GSD memory
 */
export declare function register(options: RegisterOptions): Promise<RegisterResult>;
/**
 * Get status of all registered projects
 */
export declare function status(): Promise<{
    qmdAvailable: boolean;
    projects: Array<{
        name: string;
        path: string;
        qmdCollection?: string;
        registeredAt: string;
        lastIndexed?: string;
        documentCount?: number;
    }>;
}>;
/**
 * Unregister a project
 */
export declare function unregister(name: string): Promise<{
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=register.d.ts.map