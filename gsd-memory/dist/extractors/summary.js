import { parseFrontmatter } from './frontmatter.js';
/**
 * Extract structured data from a SUMMARY.md file
 */
export function extractSummary(markdown) {
    const { frontmatter, content } = parseFrontmatter(markdown);
    return {
        // Identifiers
        phase: frontmatter.phase || '',
        plan: frontmatter.plan || '',
        subsystem: frontmatter.subsystem || '',
        tags: frontmatter.tags || [],
        // Dependency graph
        requires: extractRequires(frontmatter.requires),
        provides: frontmatter.provides || [],
        affects: frontmatter.affects || [],
        // Tech tracking
        techStack: extractTechStack(frontmatter['tech-stack']),
        patterns: frontmatter['patterns-established'] || [],
        // Files
        keyFiles: extractKeyFiles(frontmatter['key-files']),
        // Decisions
        decisions: extractDecisions(frontmatter['key-decisions']),
        // Metadata
        duration: frontmatter.duration || '',
        completed: formatCompleted(frontmatter.completed),
        // Content
        oneLiner: extractOneLiner(content)
    };
}
function extractRequires(requires) {
    if (!Array.isArray(requires))
        return [];
    return requires.map((req) => ({
        phase: req.phase || '',
        provides: req.provides || ''
    }));
}
function extractTechStack(techStack) {
    if (!techStack || typeof techStack !== 'object')
        return [];
    const ts = techStack;
    const added = ts.added;
    if (!Array.isArray(added))
        return [];
    return added.map((entry) => {
        // Handle both object format { library: version } and string format
        if (typeof entry === 'object' && entry !== null) {
            const [library, version] = Object.entries(entry)[0] || ['', ''];
            return { library, version: String(version) };
        }
        return { library: String(entry), version: '' };
    });
}
function extractKeyFiles(keyFiles) {
    if (!keyFiles || typeof keyFiles !== 'object') {
        return { created: [], modified: [] };
    }
    const kf = keyFiles;
    return {
        created: kf.created || [],
        modified: kf.modified || []
    };
}
function extractDecisions(decisions) {
    if (!Array.isArray(decisions))
        return [];
    return decisions.map((d) => ({
        decision: String(d),
        source: 'frontmatter'
    }));
}
function formatCompleted(completed) {
    if (!completed)
        return '';
    // If it's a Date object (YAML parsed it), format as ISO date
    if (completed instanceof Date) {
        return completed.toISOString().split('T')[0];
    }
    return String(completed);
}
function extractOneLiner(content) {
    // The one-liner is the bold text after the title
    // Pattern: # Title\n\n**one-liner**
    const match = content.match(/^#[^\n]+\n\n\*\*([^*]+)\*\*/m);
    return match ? match[1].trim() : '';
}
//# sourceMappingURL=summary.js.map