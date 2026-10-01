import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../components/EmptyState';
import { t } from '../lib/i18n';

/**
 * V2-C — the filtered-empty state (search with no hits, or an empty
 * active-collection filter). Distinct from `WelcomeCard`, which main.jsx still
 * uses for a truly empty TabHub.
 */
describe('EmptyState', () => {
  it('shows the search-empty copy for the "search" variant', () => {
    render(<EmptyState variant="search" />);
    expect(screen.getByText(t('emptySearchTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('emptySearchHint'))).toBeInTheDocument();
    expect(screen.queryByText(t('emptyCollectionTitle'))).toBeNull();
  });

  it('shows the empty-collection copy for the "collection" variant', () => {
    render(<EmptyState variant="collection" />);
    expect(screen.getByText(t('emptyCollectionTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('emptyCollectionHint'))).toBeInTheDocument();
    expect(screen.queryByText(t('emptySearchTitle'))).toBeNull();
  });

  it('calls both clear callbacks when 清除筛选 is clicked', () => {
    const onClearSearch = vi.fn();
    const onClearCollectionFilter = vi.fn();
    render(
      <EmptyState
        variant="search"
        onClearSearch={onClearSearch}
        onClearCollectionFilter={onClearCollectionFilter}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: t('clearFilters') }));

    expect(onClearSearch).toHaveBeenCalledTimes(1);
    expect(onClearCollectionFilter).toHaveBeenCalledTimes(1);
  });

  it('survives missing callbacks (both optional)', () => {
    render(<EmptyState variant="collection" />);
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: t('clearFilters') }))
    ).not.toThrow();
  });

  it('renders no inline var() colour', () => {
    const { container } = render(<EmptyState variant="search" />);
    for (const el of container.querySelectorAll('[style]')) {
      expect(el.getAttribute('style')).not.toContain('var(--');
    }
  });
});
