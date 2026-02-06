import { type Pitfall } from '../extractors/research.js';
export interface PitfallResult extends Pitfall {
    project: string;
    phase?: string;
    domain: string;
    source: string;
}
export interface PitfallOptions {
    query?: string;
    project?: string;
    domain?: string;
    limit?: number;
}
/**
 * Search for pitfalls documented across all registered GSD projects
 */
export declare function findPitfalls(options: PitfallOptions): Promise<PitfallResult[]>;
//# sourceMappingURL=pitfalls.d.ts.map