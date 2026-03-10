import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant({ context }: { context?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated, context }),
      });
      const data = await res.json();

      if (res.status === 503) {
        setAvailable(false);
        setErrorCode(data.errorCode || null);
        return;
      }

      if (res.status === 429) {
        setMessages([...updated, { role: 'assistant', content: 'I\'m getting too many requests right now. Please wait a moment and try again.' }]);
        return;
      }

      setAvailable(true);
      if (data.reply) {
        setMessages([...updated, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages([...updated, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-50"
        title="AI Assistant"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-accent to-purple-600">
        <div>
          <h3 className="text-sm font-bold text-white">AI Admissions Counselor</h3>
          <p className="text-[10px] text-white/70">Powered by Claude</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {available === false && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
            {errorCode === 'BILLING'
              ? 'AI Assistant is temporarily unavailable — the AI service billing needs attention. Please check your Anthropic API account and ensure it has sufficient credits.'
              : errorCode === 'INVALID_KEY'
              ? 'AI Assistant can\'t connect — the configured API key appears to be invalid. Please check the ANTHROPIC_API_KEY in your environment settings.'
              : 'AI Assistant is not available. An API key must be configured to enable this feature.'}
          </div>
        )}

        {messages.length === 0 && available !== false && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">Ask me anything about college admissions!</p>
            <div className="mt-3 space-y-1.5">
              {['How should I structure my Common App essay?', 'What makes a strong extracurricular profile?', 'How can I improve my SAT score?'].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="block w-full text-left text-xs text-accent hover:text-accent/80 p-2 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-md'
                : 'bg-slate-100 text-primary rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {available !== false && (
        <div className="p-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about admissions..."
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-accent text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-accent/90 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
