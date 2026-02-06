/**
 * Extract YAML frontmatter from markdown content
 * Returns empty object if no frontmatter or invalid YAML
 */
export declare function extractFrontmatter(markdown: string): Record<string, unknown>;
/**
 * Extract frontmatter and content separately
 */
export declare function parseFrontmatter(markdown: string): {
    frontmatter: Record<string, unknown>;
    content: string;
};
//# sourceMappingURL=frontmatter.d.ts.map