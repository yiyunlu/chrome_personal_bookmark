import React, { useCallback, useRef, useState } from 'react';
import { ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { t } from '../lib/i18n';
import { cn } from '../lib/cn';

/* P6c — the chat panel on token classes.

   Colours are the contract's mapping of the legacy aliases: --panel-bg is
   `bg-card`, --panel-border `border-border`, --shadow `shadow-panel`, --text
   `text-foreground`, --muted `text-muted-foreground`, --accent / --btn-primary
   `bg-primary` + `text-primary-foreground`, --input-bg `bg-background`.

   The panel itself is a <Card>: it is a genuine surface, and Card already ships
   the contract's card radius (rounded-xl), border and surface colour, so the
   hand-rolled off-scale radius is gone rather than re-specified. `shadow-panel` is
   the project's elevation shadow and only displaces Card's own `shadow`
   because src/lib/cn.js registers the custom shadow scale with tailwind-merge. */
const PANEL_CLASS =
  'fixed bottom-4 right-4 z-50 flex max-h-[70vh] w-96 flex-col overflow-hidden shadow-panel animate-slide-up';

/* Overrides of shadcn's Input base, all resolved through cn():
   `w-full`→`w-auto flex-1` (the row is a flex container), `bg-transparent`→
   `bg-background` (the legacy --input-bg), `shadow-sm`→none, and the accent
   focus ring written as `ring-2` + `ring-primary` — two different
   tailwind-merge groups, unlike the arbitrary-value ring it replaces.

   `md:text-sm` is restated deliberately. Input ships `text-base md:text-sm` and
   tailwind-merge keys a responsive variant as its own group, so an unprefixed
   `text-sm` removes `text-base` and leaves `md:text-sm` alive. Here the two
   values agree, so the leftover is harmless — but the rule is stated in the
   style contract and a future size change to this field would walk into it. */
const CHAT_INPUT_CLASS = cn(
  'w-auto flex-1 bg-background shadow-none',
  'text-sm md:text-sm',
  'focus-visible:ring-2 focus-visible:ring-primary'
);

export function ChatPanel({ open, onClose, onSendMessage, messages }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    try {
      await onSendMessage(text);
      scrollToBottom();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <Card className={PANEL_CLASS}>
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <span className="text-sm font-semibold">{t('chatTitle')}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={onClose}
          aria-label={t('close')}
          title={t('close')}
        >
          {/* No size prop: inside a Button the cva's [&_svg]:size-4 owns it. */}
          <X />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            {/* An illustration glyph: 20px per the contract's icon table. */}
            <MessageCircle size={20} className="mx-auto mb-2 text-faint" />
            <div className="text-xs text-muted-foreground">{t('chatHint')}</div>
            <div className="mt-1 space-y-1 text-xs text-muted-foreground">
              <div>{t('chatExample1')}</div>
              <div>{t('chatExample2')}</div>
              <div>{t('chatExample3')}</div>
              <div>{t('chatExample4')}</div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const mine = msg.role === 'user';
          return (
            <div key={idx} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                )}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.results && msg.results.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.results.map((r, i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs',
                          // The old rgba(255,255,255,0.1) reads as a tint only on
                          // the filled bubble; --ui-primary-foreground IS white,
                          // so `/10` reproduces it exactly there and the other
                          // side gets a real surface token instead.
                          mine ? 'bg-primary-foreground/10' : 'bg-background'
                        )}
                      >
                        <ExternalLink size={12} className="flex-shrink-0" />
                        <span className="truncate">{r.title}</span>
                        {r.collection && (
                          <span className="flex-shrink-0 opacity-60">({r.collection})</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {msg.action && msg.action !== 'organize' && (
                  <div className="mt-2 flex gap-2">
                    {msg.onConfirm && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-auto px-2 py-0.5 text-xs"
                        onClick={msg.onConfirm}
                      >
                        {t('chatConfirm')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex flex-shrink-0 items-center gap-2 border-t border-border px-4 py-3">
        {/* Deliberately shadcn's `Input`, not `Textarea`: the send-key contract
            below is unchanged, and in a textarea Shift+Enter would start
            inserting newlines instead of doing nothing. */}
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chatPlaceholder')}
          aria-label={t('chatPlaceholder')}
          className={CHAT_INPUT_CLASS}
          autoFocus
        />
        <Button
          type="button"
          size="icon"
          className="flex-shrink-0"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          aria-label={t('chatSend')}
          title={t('chatSend')}
        >
          <Send />
        </Button>
      </div>
    </Card>
  );
}

/* The floating launcher. `[&_svg]:size-5` is the sanctioned way to set a glyph
   size inside a Button — a `size` prop there is inert — and 20px is what a 48px
   circular control asks for. */
export function ChatToggle({ onClick, hasUnread }) {
  return (
    <Button
      type="button"
      size="icon"
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full shadow-panel [&_svg]:size-5"
      aria-label={t('chatTitle')}
      title={t('chatTitle')}
    >
      <MessageCircle />
      {hasUnread && (
        <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-card bg-destructive" />
      )}
    </Button>
  );
}
