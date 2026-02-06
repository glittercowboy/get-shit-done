export interface OutOfScopeItem {
    item: string;
    reason: string;
}
export interface Constraint {
    type: string;
    value: string;
    why?: string;
}
export interface Decision {
    decision: string;
    rationale: string;
    outcome: string;
}
export interface Requirements {
    validated: string[];
    active: string[];
    outOfScope: OutOfScopeItem[];
}
export interface ProjectData {
    name: string;
    description: string;
    coreValue: string;
    requirements: Requirements;
    context: string;
    constraints: Constraint[];
    decisions: Decision[];
}
/**
 * Extract structured data from a PROJECT.md file
 */
export declare function extractProject(markdown: string): ProjectData;
//# sourceMappingURL=project.d.ts.map