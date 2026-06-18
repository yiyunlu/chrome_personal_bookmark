/**
 * Consolidated Domain Taxonomy
 *
 * Single source of truth for domain-to-category mappings used across the app.
 * Three consumers derive their own shapes via adapter functions:
 *   - aiService.js    → getDomainCategory(domain)
 *   - searchService.js → getCategoryKeywords()
 *   - enrichmentService.js → getTagRules()
 */

/**
 * Canonical domain → category mapping.
 *
 * Each entry maps a domain string to a descriptor object:
 *   - category (string): English category name (used by aiService mock)
 *   - searchKeywords (string[]): extra keywords that expand searches for this category
 *   - tags (string[]): Chinese tags for enrichment tagging
 *
 * Domains not present here can still be matched by title-keyword or category-keyword
 * tables below.
 */
export const DOMAIN_TAXONOMY = {
  // ── Development ──────────────────────────────────────────────
  'github.com': {
    category: 'Development',
    searchKeywords: ['github', 'code'],
    tags: ['开发', 'GitHub']
  },
  'stackoverflow.com': {
    category: 'Development',
    searchKeywords: ['stackoverflow'],
    tags: ['开发', '问答']
  },
  'npmjs.com': {
    category: 'Development',
    searchKeywords: ['npmjs'],
    tags: ['开发', 'npm']
  },
  'developer.mozilla.org': {
    category: 'Development',
    searchKeywords: ['developer', 'mdn'],
    tags: ['开发', '文档']
  },

  // ── Reading / Content ────────────────────────────────────────
  'medium.com': {
    category: 'Reading',
    searchKeywords: ['medium'],
    tags: ['阅读', '博客']
  },
  'dev.to': {
    category: 'Reading',
    searchKeywords: ['dev.to'],
    tags: ['阅读', '开发']
  },
  'news.ycombinator.com': {
    category: 'Reading',
    searchKeywords: ['ycombinator'],
    tags: []
  },

  // ── Social ───────────────────────────────────────────────────
  'twitter.com': {
    category: 'Social',
    searchKeywords: ['twitter'],
    tags: ['社交']
  },
  'x.com': {
    category: 'Social',
    searchKeywords: ['x.com'],
    tags: ['社交']
  },
  'reddit.com': {
    category: 'Social',
    searchKeywords: ['reddit'],
    tags: ['社交', '论坛']
  },
  'facebook.com': {
    category: 'Social',
    searchKeywords: ['facebook'],
    tags: []
  },
  'instagram.com': {
    category: 'Social',
    searchKeywords: ['instagram'],
    tags: []
  },
  'linkedin.com': {
    category: 'Social',
    searchKeywords: ['linkedin'],
    tags: ['社交', '职业']
  },

  // ── Media: Video ─────────────────────────────────────────────
  'youtube.com': {
    category: 'Media',
    searchKeywords: ['youtube'],
    tags: ['视频']
  },
  'vimeo.com': {
    category: 'Media',
    searchKeywords: ['vimeo'],
    tags: ['视频']
  },
  'twitch.tv': {
    category: 'Media',
    searchKeywords: ['twitch'],
    tags: ['视频']
  },

  // ── Media: Music ─────────────────────────────────────────────
  'spotify.com': {
    category: 'Media',
    searchKeywords: ['spotify'],
    tags: ['音乐']
  },
  'soundcloud.com': {
    category: 'Media',
    searchKeywords: ['soundcloud'],
    tags: ['音乐']
  },

  // ── Shopping ─────────────────────────────────────────────────
  'amazon.com': {
    category: 'Shopping',
    searchKeywords: ['amazon'],
    tags: ['购物'],
    tagPattern: /amazon\./i // match all Amazon TLDs (amazon.co.uk, amazon.de, etc.)
  },
  'ebay.com': {
    category: 'Shopping',
    searchKeywords: ['ebay'],
    tags: ['购物']
  },

  // ── Productivity ─────────────────────────────────────────────
  'docs.google.com': {
    category: 'Productivity',
    searchKeywords: ['docs.google'],
    tags: ['效率', '文档']
  },
  'notion.so': {
    category: 'Productivity',
    searchKeywords: ['notion'],
    tags: ['效率']
  },
  'trello.com': {
    category: 'Productivity',
    searchKeywords: ['trello'],
    tags: ['效率']
  },
  'asana.com': {
    category: 'Productivity',
    searchKeywords: ['asana'],
    tags: ['效率']
  },

  // ── Design ───────────────────────────────────────────────────
  'figma.com': {
    category: 'Design',
    searchKeywords: ['figma'],
    tags: ['设计']
  },
  'dribbble.com': {
    category: 'Design',
    searchKeywords: ['dribbble'],
    tags: ['设计', '灵感']
  },
  'behance.net': {
    category: 'Design',
    searchKeywords: ['behance'],
    tags: ['设计']
  },

  // ── Learning ─────────────────────────────────────────────────
  'udemy.com': {
    category: 'Learning',
    searchKeywords: ['udemy'],
    tags: ['教程']
  },
  'coursera.org': {
    category: 'Learning',
    searchKeywords: ['coursera'],
    tags: ['教程']
  }
};

/**
 * Title-keyword → category mapping (used by aiService mock categorization).
 * Kept separate because these are not domain-based.
 */
export const TITLE_KEYWORDS = {
  react: 'Development',
  vue: 'Development',
  javascript: 'Development',
  typescript: 'Development',
  python: 'Development',
  api: 'Development',
  tutorial: 'Learning',
  course: 'Learning',
  recipe: 'Lifestyle',
  travel: 'Lifestyle',
  news: 'Reading',
  blog: 'Reading'
};

/**
 * Title-pattern → tags mapping (used by enrichmentService tag generation).
 * Kept separate because these match against bookmark titles, not URLs.
 */
export const TITLE_TAG_RULES = [
  { pattern: /react/i, tags: ['React'] },
  { pattern: /vue/i, tags: ['Vue'] },
  { pattern: /angular/i, tags: ['Angular'] },
  { pattern: /typescript|ts\b/i, tags: ['TypeScript'] },
  { pattern: /javascript|js\b/i, tags: ['JavaScript'] },
  { pattern: /python/i, tags: ['Python'] },
  { pattern: /rust/i, tags: ['Rust'] },
  { pattern: /tutorial|教程/i, tags: ['教程'] },
  { pattern: /guide|指南/i, tags: ['指南'] },
  { pattern: /api\b/i, tags: ['API'] },
  { pattern: /blog|博客/i, tags: ['博客'] }
];

/**
 * Extra search keywords that are not tied to a specific domain but belong
 * to a category. These are merged into getCategoryKeywords() output.
 */
const EXTRA_CATEGORY_SEARCH_KEYWORDS = {
  development: ['code', 'programming', 'dev', 'api', 'sdk'],
  'social media': ['social', 'mastodon'],
  reading: ['news', 'blog', 'article', 'substack'],
  shopping: ['shop', 'store', 'buy', 'price', 'deal'],
  video: ['video', 'watch', 'stream'],
  music: ['music', 'playlist', 'audio'],
  design: ['design', 'ui', 'ux'],
  productivity: ['calendar', 'tool'],
  learning: ['tutorial', 'course', 'learn', 'education'],
  reference: ['docs', 'documentation', 'wiki', 'reference', 'manual', 'mdn']
};

// ── Adapter functions ──────────────────────────────────────────

/**
 * Look up the category for a hostname (stripped of "www.").
 *
 * Matches exact domain or parent domain (e.g. "gist.github.com" matches
 * "github.com").
 *
 * @param {string} domain - hostname without "www." prefix
 * @returns {string|null} English category name, or null if unrecognised
 */
export function getDomainCategory(domain) {
  if (DOMAIN_TAXONOMY[domain]) {
    return DOMAIN_TAXONOMY[domain].category;
  }
  // Check parent-domain match (e.g. "gist.github.com" → "github.com")
  for (const [d, entry] of Object.entries(DOMAIN_TAXONOMY)) {
    if (domain.endsWith('.' + d)) {
      return entry.category;
    }
  }
  return null;
}

/**
 * Build the CATEGORY_KEYWORDS map used by searchService.
 *
 * Shape: { [categoryLower]: string[] }
 *
 * Merges domain-derived keywords with EXTRA_CATEGORY_SEARCH_KEYWORDS.
 *
 * @returns {Record<string, string[]>}
 */
export function getCategoryKeywords() {
  // Collect keywords from DOMAIN_TAXONOMY, keyed by lowercase category
  const map = {};

  // Map category names to the search-keyword groups used by searchService
  const categoryToSearchKey = {
    Development: 'development',
    Reading: 'reading',
    Social: 'social media',
    Media: 'video', // Video/music domains get split below
    Shopping: 'shopping',
    Productivity: 'productivity',
    Design: 'design',
    Learning: 'learning'
  };

  // Domains whose category is "Media" but belong in the "music" search group
  const musicDomains = new Set(['spotify.com', 'soundcloud.com']);

  for (const [domain, entry] of Object.entries(DOMAIN_TAXONOMY)) {
    let key = categoryToSearchKey[entry.category];
    if (musicDomains.has(domain)) {
      key = 'music';
    }
    if (!key) continue;

    if (!map[key]) map[key] = [];
    map[key].push(...entry.searchKeywords);
  }

  // Merge extra keywords
  for (const [key, extras] of Object.entries(EXTRA_CATEGORY_SEARCH_KEYWORDS)) {
    if (!map[key]) map[key] = [];
    map[key].push(...extras);
  }

  // Deduplicate each category
  for (const key of Object.keys(map)) {
    map[key] = [...new Set(map[key])];
  }

  return map;
}

/**
 * Build the TAG_RULES array used by enrichmentService.
 *
 * Shape: Array<{ pattern: RegExp, tags: string[] }>
 *
 * Only domains with non-empty tags are included. An extra generic
 * "docs." rule is appended to match documentation subdomains.
 *
 * @returns {Array<{pattern: RegExp, tags: string[]}>}
 */
export function getTagRules() {
  const rules = [];

  for (const [domain, entry] of Object.entries(DOMAIN_TAXONOMY)) {
    if (entry.tags.length === 0) continue;
    // Use custom tagPattern when provided, otherwise derive from domain
    const pattern = entry.tagPattern
      ? entry.tagPattern
      : new RegExp(domain.replace(/\./g, '\\.'), 'i');
    rules.push({
      pattern,
      tags: [...entry.tags]
    });
  }

  // Generic docs. subdomain rule (was in the original TAG_RULES)
  rules.push({ pattern: /docs\./i, tags: ['文档'] });

  return rules;
}
