import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AICategorizeModal } from '../components/AICategorizeModal';
import { clickOverlay } from './dialogHelpers';

describe('AICategorizeModal', () => {
  const defaultProps = {
    onAcceptSuggestion: vi.fn(),
    onRejectSuggestion: vi.fn(),
    onApplyAll: vi.fn(),
    onClose: vi.fn()
  };

  // The panel is portalled to document.body, so an assertion on RTL's container
  // would pass whether or not the dialog rendered. Assert on the document.
  it('renders nothing when aiState is null', () => {
    render(<AICategorizeModal aiState={null} {...defaultProps} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[data-dialog-overlay]')).toBeNull();
    expect(screen.queryByText('AI 智能分类')).not.toBeInTheDocument();
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
    // P4 replaced the `title` attributes with a Radix tooltip, so these are now
    // found by accessible name — which is what `aria-label` supplies, and what a
    // tooltip (aria-describedby) could not.
    expect(screen.getByRole('button', { name: '接受' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拒绝' })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: '接受' }));
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
    fireEvent.click(screen.getByRole('button', { name: '拒绝' }));
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

  // Same user-visible behaviour as before, driven through the portalled
  // backdrop instead of RTL's container: pressing the dim area closes the
  // dialog. Radix dismisses on the real outside-pointer sequence, which
  // clickOverlay() performs.
  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const aiState = { loading: false, suggestions: [], newCollections: [], error: null };

    render(<AICategorizeModal aiState={aiState} {...defaultProps} onClose={onClose} />);
    await clickOverlay();
    expect(onClose).toHaveBeenCalled();
  });
});
