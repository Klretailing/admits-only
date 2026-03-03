import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */

interface PodSummary {
  id: string;
  name: string;
  description: string;
  inviteCode: string;
  memberCount: number;
  myRole: string;
  lastMessage: { content: string; userName: string; createdAt: string } | null;
  joinedAt: string;
}

interface PodMessage {
  id: string;
  podId: string;
  userId: string;
  content: string;
  type: string;
  essayId: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

interface PodMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export default function StudyPods() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const [pods, setPods] = useState<PodSummary[]>([]);
  const [selectedPod, setSelectedPod] = useState<PodSummary | null>(null);
  const [messages, setMessages] = useState<PodMessage[]>([]);
  const [members, setMembers] = useState<PodMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Form states
  const [newPodName, setNewPodName] = useState('');
  const [newPodDesc, setNewPodDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = (session?.user as any)?.id || '';

  /* ─── Load pods ─── */
  const loadPods = useCallback(async () => {
    try {
      const r = await fetch('/api/pods');
      const data = await r.json();
      setPods(data.pods || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadPods();
  }, [status, loadPods]);

  /* ─── Load messages for selected pod ─── */
  const loadMessages = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pods?action=messages&podId=${podId}`);
      const data = await r.json();
      setMessages(data.messages || []);
    } catch { /* ignore */ }
  }, []);

  const loadMembers = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pods?action=members&podId=${podId}`);
      const data = await r.json();
      setMembers(data.members || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (selectedPod) {
      loadMessages(selectedPod.id);
      loadMembers(selectedPod.id);
      const interval = setInterval(() => loadMessages(selectedPod.id), 8000);
      return () => clearInterval(interval);
    }
  }, [selectedPod, loadMessages, loadMembers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ─── Actions ─── */
  const createPod = async () => {
    if (!newPodName.trim()) return;
    setError('');
    try {
      const r = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: newPodName, description: newPodDesc }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      setShowCreate(false);
      setNewPodName('');
      setNewPodDesc('');
      loadPods();
    } catch { setError('Failed to create pod'); }
  };

  const joinPod = async () => {
    if (!joinCode.trim()) return;
    setError('');
    try {
      const r = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', inviteCode: joinCode }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error); return; }
      setShowJoin(false);
      setJoinCode('');
      loadPods();
    } catch { setError('Failed to join pod'); }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedPod || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', podId: selectedPod.id, content: messageText }),
      });
      if (r.ok) {
        setMessageText('');
        loadMessages(selectedPod.id);
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const leavePod = async (podId: string) => {
    try {
      await fetch('/api/pods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podId }),
      });
      if (selectedPod?.id === podId) {
        setSelectedPod(null);
        setMessages([]);
      }
      loadPods();
    } catch { /* ignore */ }
  };

  const copyInviteCode = () => {
    if (selectedPod) {
      navigator.clipboard.writeText(selectedPod.inviteCode);
      setShowInvite(true);
      setTimeout(() => setShowInvite(false), 2000);
    }
  };

  if (status !== 'authenticated') return null;

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <DashboardLayout>
      <Head><title>Study Pods | AdmitsOnly Dashboard</title></Head>

      <div className="h-[calc(100vh-7rem)]">
        <div className="grid h-full lg:grid-cols-[280px_1fr] gap-0 bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* ─── POD LIST SIDEBAR ─── */}
          <div className="border-r border-slate-100 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold font-display text-primary">Study Pods</h2>
                <span className="text-xs text-slate-400">{pods.length} pod{pods.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
                >
                  + Create
                </button>
                <button
                  onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Create dialog */}
            {showCreate && (
              <div className="p-4 border-b border-slate-100 bg-accent/5 space-y-2">
                <input
                  type="text"
                  value={newPodName}
                  onChange={e => setNewPodName(e.target.value)}
                  placeholder="Pod name (e.g. Essay Review Squad)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  autoFocus
                />
                <textarea
                  value={newPodDesc}
                  onChange={e => setNewPodDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  <button onClick={createPod} className="text-xs font-semibold text-accent hover:text-accent/80">Create Pod</button>
                </div>
              </div>
            )}

            {/* Join dialog */}
            {showJoin && (
              <div className="p-4 border-b border-slate-100 bg-purple-50 space-y-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  maxLength={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono tracking-wider text-center uppercase focus:outline-none focus:ring-2 focus:ring-purple-300"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowJoin(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                  <button onClick={joinPod} className="text-xs font-semibold text-purple-600 hover:text-purple-800">Join Pod</button>
                </div>
              </div>
            )}

            {/* Pod list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
              ) : pods.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500 mb-1">No pods yet</p>
                  <p className="text-xs text-slate-400">Create a pod or join one with an invite code to start collaborating.</p>
                </div>
              ) : (
                pods.map(pod => (
                  <button
                    key={pod.id}
                    onClick={() => setSelectedPod(pod)}
                    className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                      selectedPod?.id === pod.id ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-primary truncate">{pod.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {pod.memberCount} member{pod.memberCount !== 1 ? 's' : ''}
                          {pod.myRole === 'admin' && <span className="ml-1 text-accent font-medium">&middot; Admin</span>}
                        </p>
                      </div>
                      {pod.lastMessage && (
                        <span className="text-[10px] text-slate-300 flex-shrink-0">{formatTime(pod.lastMessage.createdAt)}</span>
                      )}
                    </div>
                    {pod.lastMessage && (
                      <p className="text-[11px] text-slate-400 mt-1 truncate">
                        <span className="font-medium">{pod.lastMessage.userName}:</span> {pod.lastMessage.content}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ─── CHAT / POD VIEW ─── */}
          {selectedPod ? (
            <div className="flex flex-col h-full">
              {/* Pod header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-primary">{selectedPod.name}</h3>
                  {selectedPod.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{selectedPod.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Invite code button */}
                  <button
                    onClick={copyInviteCode}
                    className="relative px-3 py-1.5 text-[11px] font-mono tracking-wider text-accent bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
                    title="Copy invite code"
                  >
                    {selectedPod.inviteCode}
                    {showInvite && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </button>
                  {/* Members button */}
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-all"
                    title="View members"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m6 5.197V20" />
                    </svg>
                  </button>
                  {/* Leave button */}
                  <button
                    onClick={() => leavePod(selectedPod.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Leave pod"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Members panel (toggle) */}
              {showMembers && (
                <div className="p-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Members ({members.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-[9px] font-bold">
                          {m.user.name[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">{m.user.name}</span>
                        {m.role === 'admin' && <span className="text-[9px] text-accent font-bold">Admin</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-slate-400">No messages yet</p>
                      <p className="text-xs text-slate-300 mt-1">Start the conversation — share your essay ideas, ask for feedback, or just say hi.</p>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.user.id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isMe ? 'order-2' : ''}`}>
                          {!isMe && (
                            <p className="text-[10px] font-semibold text-slate-400 mb-0.5 ml-1">{msg.user.name}</p>
                          )}
                          <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMe
                              ? 'bg-accent text-white rounded-br-md'
                              : 'bg-slate-100 text-primary rounded-bl-md'
                          }`}>
                            {msg.type === 'essay_share' && (
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isMe ? 'text-white/70' : 'text-accent'}`}>
                                Shared Essay
                              </p>
                            )}
                            {msg.content}
                          </div>
                          <p className={`text-[10px] text-slate-300 mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-slate-100">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
                    className="px-4 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state — no pod selected */
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm px-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-5">
                  <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold font-display text-primary mb-2">Study Pods</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Collaborate with peers in small study groups. Share essay drafts, give feedback, and grow together.
                </p>
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-xs text-slate-400">Create a pod and invite friends, or join one with a code.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
