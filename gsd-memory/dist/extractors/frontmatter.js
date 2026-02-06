import matter from 'gray-matter';
/**
 * Extract YAML frontmatter from markdown content
 * Returns empty object if no frontmatter or invalid YAML
 */
export function extractFrontmatter(markdown) {
    try {
        const { data } = matter(markdown);
        return data || {};
    }
    catch {
        // Return empty object on parse errors
        return {};
    }
}
/**
 * Extract frontmatter and content separately
 */
export function parseFrontmatter(markdown) {
    try {
        const { data, content } = matter(markdown);
        return {
            frontmatter: data || {},
            content: content.trim()
        };
    }
    catch {
        return {
            frontmatter: {},
            content: markdown.trim()
        };
    }
}
//# sourceMappingURL=frontmatter.js.map