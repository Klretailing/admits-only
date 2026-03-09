import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const STARTER_PROMPTS = [
  'What should I focus on to strengthen my application?',
  'Help me brainstorm essay topics based on my ECs',
  'Which reach schools should I consider?',
  'Review my profile and give me honest feedback',
  'What are my biggest weaknesses as an applicant?',
  'Help me plan my application timeline',
];

export default function PersonalAgent() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
    setLoadingHistory(false);
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setView('chat');
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    setConversationId(convId);
    setMessages([]);
    setView('chat');
    // Messages will be loaded server-side as context; show empty for now
    // The conversation context is handled server-side via prevMessages
  }, []);

  const deleteConversation = useCallback(async (convId: string) => {
    try {
      await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', conversationId: convId }),
      });
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (conversationId === convId) startNewChat();
    } catch {}
  }, [conversationId, startNewChat]);

  async function send(overrideMessage?: string) {
    const text = (overrideMessage || input).trim();
    if (!text || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          action: 'chat',
        }),
      });
      const data = await res.json();

      if (res.status === 503) {
        setAvailable(false);
        setLoading(false);
        return;
      }

      setAvailable(true);
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an issue. Please try again.' }]);
    }
    setLoading(false);
  }

  // Format message content with basic markdown
  function formatContent(text: string) {
    return text.split('\n').map((line, i) => {
      // Bold
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (formatted.match(/^[-•]\s/)) {
        formatted = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-40 mr-2 relative top-[-1px]"></span>${formatted.slice(2)}`;
        return <div key={i} className="flex items-start ml-1 mb-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      // Numbered lists
      if (formatted.match(/^\d+\.\s/)) {
        return <div key={i} className="ml-1 mb-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      if (formatted.trim() === '') return <div key={i} className="h-2" />;
      return <div key={i} className="mb-0.5" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  }

  // Floating action button when closed
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 w-14 h-14 rounded-full bg-gradient-to-br from-accent to-purple-600 text-white shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 hover:scale-105 transition-all flex items-center justify-center z-50 group"
        title="Talk to Ari — Your AI Advisor"
      >
        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {/* Pulse indicator */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[420px] lg:max-h-[680px] lg:h-[80vh] bg-white lg:rounded-2xl shadow-2xl border-0 lg:border border-slate-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-accent to-purple-600 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ari</h3>
            <p className="text-[10px] text-white/70">Your Personal Admissions Advisor</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setView(view === 'history' ? 'chat' : 'history'); if (view === 'chat') loadConversations(); }}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="Conversation history"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={startNewChat}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
            title="New conversation"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* History view */}
      {view === 'history' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-primary">Recent Conversations</h4>
            <button
              onClick={startNewChat}
              className="text-xs text-accent font-semibold hover:underline"
            >
              + New Chat
            </button>
          </div>
          {loadingHistory ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-sm text-slate-400">Loading...</div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">No conversations yet</p>
              <p className="text-xs text-slate-300 mt-1">Start chatting with Ari to get personalized advice!</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`p-3 rounded-xl border cursor-pointer group transition-all ${
                  conversationId === conv.id ? 'border-accent/30 bg-accent/5' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => loadConversation(conv.id)}>
                    <p className="text-sm font-medium text-primary truncate">{conv.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {available === false && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                Ari is not available right now. An API key must be configured to enable AI features.
              </div>
            )}

            {messages.length === 0 && available !== false && (
              <div className="pt-4 pb-2">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-primary">Hey! I&apos;m Ari</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                    Your dedicated admissions advisor. I know your profile, your essays, and your goals. Ask me anything.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {STARTER_PROMPTS.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="w-full text-left text-[12px] text-slate-600 p-2.5 rounded-xl border border-slate-100 hover:border-accent/30 hover:bg-accent/5 hover:text-accent transition-all leading-relaxed"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-slate-50 text-primary rounded-bl-md border border-slate-100'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="space-y-0.5">{formatContent(msg.content)}</div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="bg-slate-50 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-100">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[10px] text-slate-400 ml-2">Ari is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {available !== false && (
            <div className="p-3 border-t border-slate-100 flex-shrink-0 safe-area-pb">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask Ari anything..."
                  rows={1}
                  className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none leading-relaxed"
                  disabled={loading}
                />
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="p-2.5 bg-accent text-white rounded-xl disabled:opacity-40 hover:bg-accent/90 transition-all flex-shrink-0"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
              <p className="text-[9px] text-slate-300 text-center mt-1.5">Ari remembers your conversations and learns your preferences</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
