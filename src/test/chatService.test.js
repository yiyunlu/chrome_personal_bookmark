import { describe, it, expect } from 'vitest';
import { parseCommand, executeCommand, COMMAND_TYPES } from '../lib/chatService';

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

  it('handles organize command', () => {
    const result = executeCommand({ type: COMMAND_TYPES.ORGANIZE, params: {} }, context);
    expect(result.action).toBe('organize');
  });
});
