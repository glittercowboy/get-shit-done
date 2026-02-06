export interface StackEntry {
    library: string;
    version?: string;
    purpose: string;
    whyStandard?: string;
}
export interface Pitfall {
    name: string;
    description: string;
    cause?: string;
    prevention: string;
    warningSigns?: string;
}
export interface DontHandRoll {
    problem: string;
    dontBuild: string;
    useInstead: string;
    why: string;
}
export interface UserConstraints {
    locked: string[];
    discretion: string[];
    deferred: string[];
}
export interface ResearchData {
    domain: string;
    confidence: string;
    researched: string;
    standardStack: StackEntry[];
    pitfalls: Pitfall[];
    dontHandRoll: DontHandRoll[];
    antiPatterns: string[];
    userConstraints: UserConstraints;
    primaryRecommendation: string;
}
/**
 * Extract structured data from a RESEARCH.md file
 */
export declare function extractResearch(markdown: string): ResearchData;
//# sourceMappingURL=research.d.ts.map