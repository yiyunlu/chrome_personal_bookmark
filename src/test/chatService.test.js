import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCommand, executeCommand, processChat, COMMAND_TYPES } from '../lib/chatService';

describe('parseCommand', () => {
  it('parses search commands', () => {
    expect(parseCommand('搜索 React').type).toBe(COMMAND_TYPES.SEARCH);
    expect(parseCommand('查找 GitHub').type).toBe(COMMAND_TYPES.SEARCH);
    expect(parseCommand('find React').type).toBe(COMMAND_TYPES.SEARCH);
    expect(parseCommand('search tutorial').params.query).toBe('tutorial');
  });

  it('parses move commands', () => {
    const cmd = parseCommand('移动 React 到 Development');
    expect(cmd.type).toBe(COMMAND_TYPES.MOVE);
    expect(cmd.params.bookmarkQuery).toBe('React');
    expect(cmd.params.targetCollection).toBe('Development');
  });

  it('parses English move commands', () => {
    const cmd = parseCommand('move GitHub to Development');
    expect(cmd.type).toBe(COMMAND_TYPES.MOVE);
    expect(cmd.params.bookmarkQuery).toBe('GitHub');
    expect(cmd.params.targetCollection).toBe('Development');
  });

  it('parses delete commands', () => {
    const cmd = parseCommand('删除 old bookmark');
    expect(cmd.type).toBe(COMMAND_TYPES.DELETE);
    expect(cmd.params.bookmarkQuery).toBe('old bookmark');
  });

  it('parses duplicate detection', () => {
    expect(parseCommand('查找重复').type).toBe(COMMAND_TYPES.FIND_DUPLICATES);
    expect(parseCommand('去重').type).toBe(COMMAND_TYPES.FIND_DUPLICATES);
    expect(parseCommand('duplicates').type).toBe(COMMAND_TYPES.FIND_DUPLICATES);
    // Regression: must not be swallowed by the SEARCH pattern ("find …").
    expect(parseCommand('find duplicates').type).toBe(COMMAND_TYPES.FIND_DUPLICATES);
  });

  it('does not parse "remove … to …" as a move (embedded "move" substring)', () => {
    const cmd = parseCommand('remove old article to read');
    expect(cmd.type).toBe(COMMAND_TYPES.DELETE);
    expect(cmd.params.bookmarkQuery).toBe('old article to read');
  });

  it('parses organize commands', () => {
    expect(parseCommand('整理').type).toBe(COMMAND_TYPES.ORGANIZE);
    expect(parseCommand('organize').type).toBe(COMMAND_TYPES.ORGANIZE);
  });

  it('parses info commands', () => {
    expect(parseCommand('统计').type).toBe(COMMAND_TYPES.INFO);
    expect(parseCommand('多少书签').type).toBe(COMMAND_TYPES.INFO);
  });

  it('defaults to search for unknown input', () => {
    const cmd = parseCommand('hello world');
    expect(cmd.type).toBe(COMMAND_TYPES.SEARCH);
    expect(cmd.params.query).toBe('hello world');
  });

  it('handles empty input', () => {
    expect(parseCommand('').type).toBe(COMMAND_TYPES.UNKNOWN);
    expect(parseCommand('  ').type).toBe(COMMAND_TYPES.UNKNOWN);
  });
});

describe('executeCommand', () => {
  const context = {
    collections: [
      { id: 'c1', title: 'Development', cards: [
        { id: 'b1', title: 'React Docs', url: 'https://reactjs.org', collectionTitle: 'Development' },
        { id: 'b2', title: 'GitHub', url: 'https://github.com', collectionTitle: 'Development' }
      ]},
      { id: 'c2', title: 'Reading', cards: [
        { id: 'b3', title: 'Medium Article', url: 'https://medium.com/article', collectionTitle: 'Reading' }
      ]}
    ],
    allCards: [
      { id: 'b1', title: 'React Docs', url: 'https://reactjs.org', collectionTitle: 'Development' },
      { id: 'b2', title: 'GitHub', url: 'https://github.com', collectionTitle: 'Development' },
      { id: 'b3', title: 'Medium Article', url: 'https://medium.com/article', collectionTitle: 'Reading' }
    ]
  };

  it('searches bookmarks by title', () => {
    const result = executeCommand({ type: COMMAND_TYPES.SEARCH, params: { query: 'react' } }, context);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('React Docs');
  });

  it('returns no results message for empty search', () => {
    const result = executeCommand({ type: COMMAND_TYPES.SEARCH, params: { query: 'xyz' } }, context);
    expect(result.message).toContain('未找到');
  });

  it('handles move command with valid target', () => {
    const result = executeCommand(
      { type: COMMAND_TYPES.MOVE, params: { bookmarkQuery: 'React', targetCollection: 'Reading' } },
      context
    );
    expect(result.action).toBe('move');
    expect(result.targetCollectionId).toBe('c2');
  });

  it('handles move with no target found', () => {
    const result = executeCommand(
      { type: COMMAND_TYPES.MOVE, params: { bookmarkQuery: 'React', targetCollection: 'Nonexistent' } },
      context
    );
    expect(result.message).toContain('未找到');
  });

  it('handles info command', () => {
    const result = executeCommand({ type: COMMAND_TYPES.INFO, params: {} }, context);
    expect(result.message).toContain('3 个书签');
    expect(result.message).toContain('2 个分类');
  });

  it('handles find duplicates with no duplicates', () => {
    const result = executeCommand({ type: COMMAND_TYPES.FIND_DUPLICATES, params: {} }, context);
    expect(result.message).toContain('未发现');
  });

  it('handles find duplicates with duplicates', () => {
    const contextWithDups = {
      ...context,
      allCards: [
        ...context.allCards,
        { id: 'b4', title: 'React Docs 2', url: 'https://reactjs.org', collectionTitle: 'Reading' }
      ]
    };
    const result = executeCommand({ type: COMMAND_TYPES.FIND_DUPLICATES, params: {} }, contextWithDups);
    expect(result.message).toContain('1 个重复');
    expect(result.action).toBe('delete');
  });

  it('treats protocol variants as duplicates', () => {
    const ctx = {
      ...context,
      allCards: [
        { id: 'b1', title: 'A', url: 'http://reactjs.org/docs', collectionTitle: 'Dev' },
        { id: 'b2', title: 'B', url: 'https://reactjs.org/docs', collectionTitle: 'Dev' }
      ]
    };
    const result = executeCommand({ type: COMMAND_TYPES.FIND_DUPLICATES, params: {} }, ctx);
    expect(result.results).toHaveLength(1);
  });

  it('never flags case-different paths as duplicates (deleting one would lose a distinct URL)', () => {
    const ctx = {
      ...context,
      allCards: [
        { id: 'b1', title: 'A', url: 'https://github.com/User/Repo', collectionTitle: 'Dev' },
        { id: 'b2', title: 'B', url: 'https://github.com/user/repo', collectionTitle: 'Dev' }
      ]
    };
    const result = executeCommand({ type: COMMAND_TYPES.FIND_DUPLICATES, params: {} }, ctx);
    expect(result.message).toContain('未发现');
  });

  it('does not truncate actionable results — the confirm must cover the promised count', () => {
    const manyCards = Array.from({ length: 25 }, (_, i) => ({
      id: `m${i}`,
      title: `Item ${i}`,
      url: `https://items.example/${i}`,
      collectionTitle: 'Development'
    }));
    const ctx = { ...context, allCards: manyCards };
    const result = executeCommand(
      { type: COMMAND_TYPES.MOVE, params: { bookmarkQuery: 'item', targetCollection: 'Reading' } },
      ctx
    );
    expect(result.message).toContain('25');
    expect(result.results).toHaveLength(25);
  });

  it('handles organize command', () => {
    const result = executeCommand({ type: COMMAND_TYPES.ORGANIZE, params: {} }, context);
    expect(result.action).toBe('organize');
  });
});

describe('processChat (Claude API mode)', () => {
  const context = {
    collections: [{ id: 'c1', title: 'Development', cards: [] }],
    allCards: [
      { id: 'b1', title: 'React Docs', url: 'https://reactjs.org', collectionTitle: 'Development' }
    ]
  };

  beforeEach(() => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({ tabhub_ai_api_key: 'test-api-key' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('executes the structured command Claude returns', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify({ type: 'search', message: '这是搜索结果', params: { query: 'react' } }) }]
        })
      }))
    );

    // The response message is generated locally via i18n; Claude only supplies
    // the structured command, so assert on the command it caused us to execute.
    const result = await processChat('帮我找 react 相关的书签', context);
    expect(result.results?.[0]?.title).toBe('React Docs');
  });

  it('falls back to pattern matching when the API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'err' })));

    const result = await processChat('搜索 react', context);
    expect(result.results?.[0]?.title).toBe('React Docs');
  });
});
