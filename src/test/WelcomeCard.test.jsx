import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeCard } from '../components/WelcomeCard';
import { t } from '../lib/i18n';

/* P6c moved this surface onto <Card> and <Button>. The card had no tests at
   all, so what is pinned here is the part a restyle can break invisibly: every
   control is still a real button, still carries the accessible name a user (or
   a screen reader) reaches it by, and still runs the callback `App` passes. */

const handlers = () => ({
  onSaveTabs: vi.fn(),
  onCreateCollection: vi.fn(),
  onConnectAI: vi.fn(),
  onDismiss: vi.fn()
});

const renderCard = (h) => render(<WelcomeCard {...h} />);

describe('WelcomeCard', () => {
  it('shows the title and the three calls to action', () => {
    renderCard(handlers());

    expect(screen.getByRole('heading', { name: t('welcomeTitle') })).toBeInTheDocument();
    expect(screen.getByText(t('welcomeMessage'))).toBeInTheDocument();
    for (const key of ['welcomeSaveTabs', 'welcomeCreateCollection', 'welcomeConnectAI']) {
      expect(screen.getByRole('button', { name: t(key) })).toBeInTheDocument();
    }
  });

  it.each([
    ['welcomeSaveTabs', 'onSaveTabs'],
    ['welcomeCreateCollection', 'onCreateCollection'],
    ['welcomeConnectAI', 'onConnectAI']
  ])('%s runs %s and nothing else', (labelKey, handlerKey) => {
    const h = handlers();
    renderCard(h);

    fireEvent.click(screen.getByRole('button', { name: t(labelKey) }));

    expect(h[handlerKey]).toHaveBeenCalledTimes(1);
    for (const [key, fn] of Object.entries(h)) {
      if (key !== handlerKey) expect(fn).not.toHaveBeenCalled();
    }
  });

  it('offers two ways to dismiss — the corner button and the text link — and both call back', () => {
    const h = handlers();
    renderCard(h);

    const dismissers = screen.getAllByRole('button', { name: t('welcomeDismiss') });
    expect(dismissers).toHaveLength(2);

    dismissers.forEach((el) => fireEvent.click(el));

    expect(h.onDismiss).toHaveBeenCalledTimes(2);
    expect(h.onSaveTabs).not.toHaveBeenCalled();
  });
});
