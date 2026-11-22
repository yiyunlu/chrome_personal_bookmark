import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChatPanel } from '../components/ChatPanel';
import { t } from '../lib/i18n';

describe('ChatPanel UX regressions (issue #28)', () => {
  describe('clickable result rows', () => {
    const searchMsg = {
      id: 'm1',
      role: 'assistant',
      text: 'Found 1 bookmark:',
      results: [
        { id: 'b1', title: 'React Docs', url: 'https://react.dev', collection: 'Dev' }
      ]
    };

    it('opens the result in the current tab on plain click', () => {
      const onOpenResult = vi.fn();
      render(
        <ChatPanel
          open
          onClose={vi.fn()}
          onSendMessage={vi.fn()}
          onOpenResult={onOpenResult}
          messages={[searchMsg]}
        />
      );

      const row = screen.getByRole('button', { name: /React Docs/ });
      fireEvent.click(row);
      expect(onOpenResult).toHaveBeenCalledWith('https://react.dev', { newTab: false });
    });

    it('opens the result in a new tab on Ctrl/Meta click or middle click', () => {
      const onOpenResult = vi.fn();
      render(
        <ChatPanel
          open
          onClose={vi.fn()}
          onSendMessage={vi.fn()}
          onOpenResult={onOpenResult}
          messages={[searchMsg]}
        />
      );

      const row = screen.getByRole('button', { name: /React Docs/ });
      fireEvent.click(row, { ctrlKey: true });
      expect(onOpenResult).toHaveBeenLastCalledWith('https://react.dev', { newTab: true });

      fireEvent.click(row, { metaKey: true });
      expect(onOpenResult).toHaveBeenLastCalledWith('https://react.dev', { newTab: true });

      fireEvent(row, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
      expect(onOpenResult).toHaveBeenLastCalledWith('https://react.dev', { newTab: true });
    });

    it('falls back to a static row when onOpenResult is omitted', () => {
      render(
        <ChatPanel open onClose={vi.fn()} onSendMessage={vi.fn()} messages={[searchMsg]} />
      );

      expect(screen.getByText('React Docs')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /React Docs/ })).toBeNull();
    });
  });

  describe('IME composition guard on Enter', () => {
    it('does not submit when Enter is pressed with keyCode 229 or nativeEvent.isComposing', async () => {
      const onSendMessage = vi.fn().mockResolvedValue(undefined);
      render(
        <ChatPanel open onClose={vi.fn()} onSendMessage={onSendMessage} messages={[]} />
      );

      const field = screen.getByRole('textbox', { name: t('chatPlaceholder') });
      fireEvent.change(field, { target: { value: '搜索' } });

      await act(async () => {
        fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
      });
      expect(onSendMessage).not.toHaveBeenCalled();
      expect(field).toHaveValue('搜索');

      const composingEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      });
      Object.defineProperty(composingEvent, 'isComposing', { value: true });
      await act(async () => {
        field.dispatchEvent(composingEvent);
      });
      expect(onSendMessage).not.toHaveBeenCalled();
      expect(field).toHaveValue('搜索');
    });
  });

  describe('confirm button state', () => {
    it('disables and switches label to Done after confirmation and prevents duplicate calls', async () => {
      let resolveConfirm;
      const onConfirm = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveConfirm = resolve;
          })
      );

      const messages = [
        {
          id: 'm2',
          role: 'assistant',
          text: 'Will move 1 bookmark',
          action: 'move',
          results: [{ id: 'b1', title: 'React Docs', url: 'https://react.dev' }],
          onConfirm,
          confirmed: false
        }
      ];

      render(
        <ChatPanel open onClose={vi.fn()} onSendMessage={vi.fn()} messages={messages} />
      );

      const btn = screen.getByRole('button', { name: t('chatConfirm') });
      expect(btn).toBeEnabled();

      act(() => {
        fireEvent.click(btn);
      });
      expect(btn).toBeDisabled();
      expect(onConfirm).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveConfirm();
      });

      const doneBtn = screen.getByRole('button', { name: t('chatConfirmed') });
      expect(doneBtn).toBeDisabled();
      fireEvent.click(doneBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('renders already-confirmed messages as disabled (survives panel close/reopen)', () => {
      const onConfirm = vi.fn();
      const messages = [
        {
          id: 'm3',
          role: 'assistant',
          text: 'Confirm delete?',
          action: 'delete',
          results: [{ id: 'b1', title: 'Old Link', url: 'https://old.example' }],
          onConfirm,
          confirmed: true
        }
      ];

      render(
        <ChatPanel open onClose={vi.fn()} onSendMessage={vi.fn()} messages={messages} />
      );

      const doneBtn = screen.getByRole('button', { name: t('chatConfirmed') });
      expect(doneBtn).toBeDisabled();
      fireEvent.click(doneBtn);
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });
});
