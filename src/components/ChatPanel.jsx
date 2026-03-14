import React, { useCallback, useRef, useState } from 'react';
import { ExternalLink, MessageCircle, Send, X } from 'lucide-react';

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
    <div
      className="fixed bottom-4 right-4 z-50 w-96 flex flex-col rounded-2xl border overflow-hidden animate-slide-up"
      style={{
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow: 'var(--shadow)',
        maxHeight: '70vh'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--panel-border)' }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle size={16} style={{ color: 'var(--accent)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            AI 助手
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:opacity-70" style={{ color: 'var(--muted)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <MessageCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--muted)', opacity: 0.5 }} />
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              试试输入：
            </div>
            <div className="text-xs mt-1 space-y-1" style={{ color: 'var(--muted)' }}>
              <div>「搜索 React」</div>
              <div>「查找重复」</div>
              <div>「统计」</div>
              <div>「移动 GitHub 到 Development」</div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
              style={{
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--input-bg)',
                color: msg.role === 'user' ? 'var(--btn-primary-text)' : 'var(--text)'
              }}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {msg.results && msg.results.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
                      style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                      <ExternalLink size={10} className="flex-shrink-0" />
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
                    <button
                      onClick={msg.onConfirm}
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: 'var(--accent)', color: 'var(--btn-primary-text)' }}
                    >
                      确认执行
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--panel-border)' }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入指令或问题…"
          className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-opacity-30"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text)'
          }}
          autoFocus
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="p-2 rounded-lg disabled:opacity-40"
          style={{ background: 'var(--btn-primary)', color: 'var(--btn-primary-text)' }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

export function ChatToggle({ onClick, hasUnread }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 w-12 h-12 flex items-center justify-center rounded-full"
      style={{
        background: 'var(--btn-primary)',
        color: 'var(--btn-primary-text)',
        boxShadow: 'var(--shadow)'
      }}
      title="AI 助手"
    >
      <MessageCircle size={20} />
      {hasUnread && (
        <span
          className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full border-2"
          style={{ background: 'var(--danger)', borderColor: 'var(--panel-bg)' }}
        />
      )}
    </button>
  );
}
