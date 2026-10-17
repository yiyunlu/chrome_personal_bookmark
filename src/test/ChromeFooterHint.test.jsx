import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChromeFooterHint } from '../components/ChromeFooterHint';
import { t } from '../lib/i18n';

const KEY = 'tabhub_chrome_footer_hint_dismissed';

function mockStorage(stored = {}) {
  chrome.storage.local.get = vi.fn((_keys, cb) => cb(stored));
  chrome.storage.local.set = vi.fn((_obj, cb) => cb());
}

describe('ChromeFooterHint', () => {
  beforeEach(() => mockStorage());

  it('renders in manage mode', async () => {
    render(<ChromeFooterHint manageMode />);
    expect(await screen.findByText(t('chromeFooterHint'))).toBeInTheDocument();
  });

  it('is absent outside manage mode', async () => {
    render(<ChromeFooterHint manageMode={false} />);
    await waitFor(() => expect(chrome.storage.local.get).toHaveBeenCalled());
    expect(screen.queryByText(t('chromeFooterHint'))).not.toBeInTheDocument();
  });

  it('dismiss hides it and persists the flag', async () => {
    render(<ChromeFooterHint manageMode />);
    fireEvent.click(await screen.findByRole('button', { name: t('chromeFooterHintDismiss') }));
    expect(screen.queryByText(t('chromeFooterHint'))).not.toBeInTheDocument();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ [KEY]: true }, expect.any(Function));
  });

  it('stays hidden when the stored flag is set', async () => {
    mockStorage({ [KEY]: true });
    render(<ChromeFooterHint manageMode />);
    await waitFor(() => expect(chrome.storage.local.get).toHaveBeenCalled());
    expect(screen.queryByText(t('chromeFooterHint'))).not.toBeInTheDocument();
  });
});
