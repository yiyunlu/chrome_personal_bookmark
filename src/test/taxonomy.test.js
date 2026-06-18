import { describe, it, expect } from 'vitest';
import {
  getDomainCategory,
  getCategoryKeywords,
  getTagRules,
  TITLE_KEYWORDS,
  TITLE_TAG_RULES
} from '../lib/taxonomy';

describe('taxonomy', () => {
  // ── getDomainCategory ──────────────────────────────────────

  describe('getDomainCategory', () => {
    it('returns Development for github.com', () => {
      expect(getDomainCategory('github.com')).toBe('Development');
    });

    it('returns Development for stackoverflow.com', () => {
      expect(getDomainCategory('stackoverflow.com')).toBe('Development');
    });

    it('returns Reading for medium.com', () => {
      expect(getDomainCategory('medium.com')).toBe('Reading');
    });

    it('returns Social for twitter.com', () => {
      expect(getDomainCategory('twitter.com')).toBe('Social');
    });

    it('returns Social for reddit.com', () => {
      expect(getDomainCategory('reddit.com')).toBe('Social');
    });

    it('returns Media for youtube.com', () => {
      expect(getDomainCategory('youtube.com')).toBe('Media');
    });

    it('returns Shopping for amazon.com', () => {
      expect(getDomainCategory('amazon.com')).toBe('Shopping');
    });

    it('returns Productivity for notion.so', () => {
      expect(getDomainCategory('notion.so')).toBe('Productivity');
    });

    it('returns Design for figma.com', () => {
      expect(getDomainCategory('figma.com')).toBe('Design');
    });

    it('returns Learning for udemy.com', () => {
      expect(getDomainCategory('udemy.com')).toBe('Learning');
    });

    it('returns null for unknown domains', () => {
      expect(getDomainCategory('unknown.com')).toBeNull();
      expect(getDomainCategory('my-random-site.org')).toBeNull();
      expect(getDomainCategory('example.test')).toBeNull();
    });

    it('matches subdomains via parent-domain lookup', () => {
      expect(getDomainCategory('gist.github.com')).toBe('Development');
      expect(getDomainCategory('api.github.com')).toBe('Development');
      expect(getDomainCategory('m.youtube.com')).toBe('Media');
      expect(getDomainCategory('music.youtube.com')).toBe('Media');
    });

    it('does not match partial domain names', () => {
      // "notgithub.com" should NOT match "github.com"
      expect(getDomainCategory('notgithub.com')).toBeNull();
    });
  });

  // ── getCategoryKeywords ────────────────────────────────────

  describe('getCategoryKeywords', () => {
    it('returns an object with expected category keys', () => {
      const keywords = getCategoryKeywords();

      expect(typeof keywords).toBe('object');
      expect(keywords).toHaveProperty('development');
      expect(keywords).toHaveProperty('social media');
      expect(keywords).toHaveProperty('reading');
      expect(keywords).toHaveProperty('shopping');
      expect(keywords).toHaveProperty('video');
      expect(keywords).toHaveProperty('music');
      expect(keywords).toHaveProperty('design');
      expect(keywords).toHaveProperty('productivity');
      expect(keywords).toHaveProperty('learning');
    });

    it('includes domain-derived keywords in each category', () => {
      const keywords = getCategoryKeywords();

      expect(keywords.development).toContain('github');
      expect(keywords.development).toContain('stackoverflow');
      expect(keywords['social media']).toContain('twitter');
      expect(keywords['social media']).toContain('reddit');
      expect(keywords.video).toContain('youtube');
      expect(keywords.music).toContain('spotify');
      expect(keywords.design).toContain('figma');
    });

    it('includes extra keywords from EXTRA_CATEGORY_SEARCH_KEYWORDS', () => {
      const keywords = getCategoryKeywords();

      expect(keywords.development).toContain('code');
      expect(keywords.development).toContain('programming');
      expect(keywords.reading).toContain('blog');
      expect(keywords.reading).toContain('article');
      expect(keywords.shopping).toContain('buy');
      expect(keywords.learning).toContain('tutorial');
    });

    it('has no duplicate keywords within a category', () => {
      const keywords = getCategoryKeywords();

      for (const [_category, list] of Object.entries(keywords)) {
        const unique = new Set(list);
        expect(unique.size).toBe(list.length);
      }
    });

    it('returns arrays of strings for each category', () => {
      const keywords = getCategoryKeywords();

      for (const list of Object.values(keywords)) {
        expect(Array.isArray(list)).toBe(true);
        for (const item of list) {
          expect(typeof item).toBe('string');
        }
      }
    });
  });

  // ── getTagRules ────────────────────────────────────────────

  describe('getTagRules', () => {
    it('returns an array of objects with pattern and tags', () => {
      const rules = getTagRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);

      for (const rule of rules) {
        expect(rule).toHaveProperty('pattern');
        expect(rule.pattern).toBeInstanceOf(RegExp);
        expect(rule).toHaveProperty('tags');
        expect(Array.isArray(rule.tags)).toBe(true);
      }
    });

    it('includes rules derived from domain taxonomy', () => {
      const rules = getTagRules();

      // github.com should generate a pattern matching rule
      const githubRule = rules.find((r) => r.pattern.test('github.com'));
      expect(githubRule).toBeDefined();
      expect(githubRule.tags).toContain('开发');
      expect(githubRule.tags).toContain('GitHub');
    });

    it('skips domains with empty tags', () => {
      const rules = getTagRules();

      // facebook.com has tags: [] — should NOT generate a rule matching facebook.com
      const facebookRule = rules.find(
        (r) => r.pattern.source.includes('facebook') && r.tags.length === 0
      );
      expect(facebookRule).toBeUndefined();
    });

    it('includes the generic docs. subdomain rule', () => {
      const rules = getTagRules();

      const docsRule = rules.find((r) => r.pattern.test('docs.example.com'));
      expect(docsRule).toBeDefined();
      expect(docsRule.tags).toContain('文档');
    });

    it('uses custom tagPattern when provided (e.g. amazon)', () => {
      const rules = getTagRules();

      // amazon has a custom tagPattern: /amazon\./i
      const amazonRule = rules.find((r) => r.pattern.test('amazon.co.uk'));
      expect(amazonRule).toBeDefined();
      expect(amazonRule.tags).toContain('购物');
    });
  });

  // ── TITLE_KEYWORDS export ──────────────────────────────────

  describe('TITLE_KEYWORDS', () => {
    it('maps programming keywords to Development', () => {
      expect(TITLE_KEYWORDS.react).toBe('Development');
      expect(TITLE_KEYWORDS.javascript).toBe('Development');
      expect(TITLE_KEYWORDS.python).toBe('Development');
      expect(TITLE_KEYWORDS.api).toBe('Development');
    });

    it('maps learning keywords to Learning', () => {
      expect(TITLE_KEYWORDS.tutorial).toBe('Learning');
      expect(TITLE_KEYWORDS.course).toBe('Learning');
    });

    it('maps content keywords to Reading', () => {
      expect(TITLE_KEYWORDS.news).toBe('Reading');
      expect(TITLE_KEYWORDS.blog).toBe('Reading');
    });
  });

  // ── TITLE_TAG_RULES export ─────────────────────────────────

  describe('TITLE_TAG_RULES', () => {
    it('is an array of objects with pattern and tags', () => {
      expect(Array.isArray(TITLE_TAG_RULES)).toBe(true);
      for (const rule of TITLE_TAG_RULES) {
        expect(rule.pattern).toBeInstanceOf(RegExp);
        expect(Array.isArray(rule.tags)).toBe(true);
      }
    });

    it('matches React titles', () => {
      const rule = TITLE_TAG_RULES.find((r) => r.pattern.test('React Tutorial'));
      expect(rule).toBeDefined();
      expect(rule.tags).toContain('React');
    });

    it('matches Python titles case-insensitively', () => {
      const rule = TITLE_TAG_RULES.find((r) => r.pattern.test('python best practices'));
      expect(rule).toBeDefined();
      expect(rule.tags).toContain('Python');
    });
  });
});
