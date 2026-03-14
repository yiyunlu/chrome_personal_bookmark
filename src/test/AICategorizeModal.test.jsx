import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AICategorizeModal } from '../components/AICategorizeModal';

describe('AICategorizeModal', () => {
  const defaultProps = {
    onAcceptSuggestion: vi.fn(),
    onRejectSuggestion: vi.fn(),
    onApplyAll: vi.fn(),
    onClose: vi.fn()
  };

  it('renders nothing when aiState is null', () => {
    const { container } = render(<AICategorizeModal aiState={null} {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows loading spinner when loading', () => {
    const aiState = { loading: true, suggestions: [], newCollections: [], error: null };
    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    expect(screen.getByText('正在分析书签…')).toBeInTheDocument();
  });

  it('shows error message', () => {
    const aiState = { loading: false, suggestions: [], newCollections: [], error: '出错了' };
    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    expect(screen.getByText('出错了')).toBeInTheDocument();
  });

  it('shows empty state when no suggestions', () => {
    const aiState = { loading: false, suggestions: [], newCollections: [], error: null };
    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    expect(screen.getByText('所有书签已在合适的分类中，无需调整。')).toBeInTheDocument();
  });

  it('renders suggestions with accept/reject buttons', () => {
    const aiState = {
      loading: false,
      error: null,
      newCollections: [],
      suggestions: [
        {
          bookmarkId: 'b1',
          bookmarkTitle: 'My Repo',
          targetCollectionTitle: 'Development',
          reason: 'github.com',
          status: 'pending'
        }
      ]
    };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    expect(screen.getByText('My Repo')).toBeInTheDocument();
    expect(screen.getByTitle('接受')).toBeInTheDocument();
    expect(screen.getByTitle('拒绝')).toBeInTheDocument();
  });

  it('calls onAcceptSuggestion when accept is clicked', () => {
    const onAccept = vi.fn();
    const aiState = {
      loading: false,
      error: null,
      newCollections: [],
      suggestions: [
        { bookmarkId: 'b1', bookmarkTitle: 'Test', targetCollectionTitle: 'Dev', reason: '', status: 'pending' }
      ]
    };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} onAcceptSuggestion={onAccept} />);
    fireEvent.click(screen.getByTitle('接受'));
    expect(onAccept).toHaveBeenCalledWith(0);
  });

  it('calls onRejectSuggestion when reject is clicked', () => {
    const onReject = vi.fn();
    const aiState = {
      loading: false,
      error: null,
      newCollections: [],
      suggestions: [
        { bookmarkId: 'b1', bookmarkTitle: 'Test', targetCollectionTitle: 'Dev', reason: '', status: 'pending' }
      ]
    };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} onRejectSuggestion={onReject} />);
    fireEvent.click(screen.getByTitle('拒绝'));
    expect(onReject).toHaveBeenCalledWith(0);
  });

  it('shows accepted badge for accepted suggestions', () => {
    const aiState = {
      loading: false,
      error: null,
      newCollections: [],
      suggestions: [
        { bookmarkId: 'b1', bookmarkTitle: 'Test', targetCollectionTitle: 'Dev', reason: '', status: 'accepted' }
      ]
    };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    expect(screen.getByText('已接受')).toBeInTheDocument();
  });

  it('disables apply button when no suggestions accepted', () => {
    const aiState = {
      loading: false,
      error: null,
      newCollections: [],
      suggestions: [
        { bookmarkId: 'b1', bookmarkTitle: 'Test', targetCollectionTitle: 'Dev', reason: '', status: 'pending' }
      ]
    };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    const applyBtn = screen.getByText('应用 0 项');
    expect(applyBtn).toBeDisabled();
  });

  it('shows new collection tags', () => {
    const aiState = {
      loading: false,
      error: null,
      newCollections: ['Design', 'Media'],
      suggestions: [
        { bookmarkId: 'b1', bookmarkTitle: 'Test', targetCollectionTitle: 'Design', reason: '', status: 'pending' }
      ]
    };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} />);
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const aiState = { loading: false, suggestions: [], newCollections: [], error: null };

    const { container } = render(<AICategorizeModal aiState={aiState} {...defaultProps} onClose={onClose} />);
    fireEvent.click(container.firstChild);
    expect(onClose).toHaveBeenCalled();
  });
});
