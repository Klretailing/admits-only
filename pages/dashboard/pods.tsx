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

/* ─── Avatar color generator ─── */
const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
  'from-lime-500 to-green-600',
  'from-red-500 to-rose-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Status indicator ─── */
function OnlineIndicator({ className = '' }: { className?: string }) {
  return (
    <span className={`absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full ${className}`} />
  );
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
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUserId = (session?.user as any)?.id || '';
  const currentUserName = session?.user?.name || 'You';

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
        inputRef.current?.focus();
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

  // Mobile: show chat view when a pod is selected
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const selectPod = (pod: PodSummary) => {
    setSelectedPod(pod);
    setMobileShowChat(true);
  };

  const mobileBackToList = () => {
    setMobileShowChat(false);
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

  const formatTimeFull = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  /* ─── Group messages by sender for Discord-style stacking ─── */
  type GroupedMessage = PodMessage & { isGroupStart: boolean; isGroupEnd: boolean };

  const groupedMessages: GroupedMessage[] = messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameUserAsPrev = prev && prev.user.id === msg.user.id &&
      (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 300000; // 5 min window
    const sameUserAsNext = next && next.user.id === msg.user.id &&
      (new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 300000;
    return {
      ...msg,
      isGroupStart: !sameUserAsPrev,
      isGroupEnd: !sameUserAsNext,
    };
  });

  /* ─── Date separators ─── */
  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = today.getTime() - msgDate.getTime();
    if (diff === 0) return 'Today';
    if (diff === 86400000) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <DashboardLayout>
      <Head><title>Study Pods | AdmitsOnly Dashboard</title></Head>

      <div className="h-[calc(100vh-12rem)] lg:h-[calc(100vh-7rem)]">
        <div className="grid h-full lg:grid-cols-[300px_1fr] gap-0 bg-white rounded-2xl border border-slate-100 overflow-hidden">

          {/* ═══════════════ CHANNEL SIDEBAR ═══════════════ */}
          <div className={`border-r border-slate-100 flex flex-col bg-slate-50/30 ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
            {/* Sidebar header */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-bold font-display text-primary">Study Pods</h2>
                    <p className="text-[10px] text-slate-400">{pods.length} pod{pods.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Create
                </button>
                <button
                  onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
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
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={createPod} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-md hover:bg-accent/90 transition-colors">Create Pod</button>
                </div>
              </div>
            )}

            {/* Join dialog */}
            {showJoin && (
              <div className="p-4 border-b border-slate-100 bg-purple-50/50 space-y-2">
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
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={joinPod} className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors">Join Pod</button>
                </div>
              </div>
            )}

            {/* Pod / channel list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
              ) : pods.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500 mb-1">No pods yet</p>
                  <p className="text-xs text-slate-400">Create a pod or join one with an invite code to start collaborating.</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5 mb-1">Your Pods</p>
                  {pods.map(pod => {
                    const isActive = selectedPod?.id === pod.id;
                    return (
                      <button
                        key={pod.id}
                        onClick={() => selectPod(pod)}
                        className={`w-full text-left p-3 rounded-xl mb-1 transition-all group ${
                          isActive
                            ? 'bg-accent/10 border border-accent/20'
                            : 'hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Pod avatar */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(pod.name)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                              {pod.name[0]?.toUpperCase()}
                            </div>
                            {pod.memberCount > 1 && <OnlineIndicator />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent' : 'text-primary'}`}>{pod.name}</p>
                              {pod.lastMessage && (
                                <span className="text-[10px] text-slate-300 flex-shrink-0">{formatTime(pod.lastMessage.createdAt)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400">
                                {pod.memberCount} member{pod.memberCount !== 1 ? 's' : ''}
                              </span>
                              {pod.myRole === 'admin' && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-bold">Admin</span>
                              )}
                            </div>
                            {pod.lastMessage && (
                              <p className="text-[11px] text-slate-400 mt-1 truncate">
                                <span className="font-medium text-slate-500">{pod.lastMessage.userName}:</span> {pod.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sidebar footer — user info */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(currentUserName)} flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(currentUserName)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary truncate">{currentUserName}</p>
                  <p className="text-[10px] text-emerald-500">Online</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ CHAT AREA ═══════════════ */}
          {selectedPod ? (
            <div className={`flex flex-col h-full bg-white ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
              {/* ─── Chat header ─── */}
              <div className="px-4 lg:px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile back button */}
                  <button
                    onClick={mobileBackToList}
                    className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-all flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(selectedPod.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                    {selectedPod.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm lg:text-base font-bold text-primary truncate">{selectedPod.name}</h3>
                    <p className="text-[11px] text-slate-400 truncate">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                      {selectedPod.description && ` — ${selectedPod.description}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Invite code */}
                  <button
                    onClick={copyInviteCode}
                    className="relative hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono tracking-wider text-accent bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
                    title="Copy invite code"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    {selectedPod.inviteCode}
                    {showInvite && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </button>
                  {/* Members toggle */}
                  <button
                    onClick={() => setShowMembers(!showMembers)}
                    className={`p-2 rounded-lg transition-all ${showMembers ? 'text-accent bg-accent/10' : 'text-slate-400 hover:text-primary hover:bg-slate-50'}`}
                    title="View members"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m6 5.197V20" />
                    </svg>
                  </button>
                  {/* More menu */}
                  <button
                    onClick={() => leavePod(selectedPod.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Leave pod"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ─── Members panel (collapsible) ─── */}
              {showMembers && (
                <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Members — {members.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="relative">
                          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getAvatarColor(m.user.name)} flex items-center justify-center text-white text-[9px] font-bold`}>
                            {getInitials(m.user.name)}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-600">{m.user.name}</span>
                        {m.role === 'admin' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-bold">Admin</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Messages area (Discord-style) ─── */}
              <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-xs">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h4 className="text-base font-bold text-primary mb-1">Welcome to {selectedPod.name}!</h4>
                      <p className="text-sm text-slate-400">This is the beginning of your pod. Start the conversation — share essay ideas, ask for feedback, or just say hi.</p>
                      {/* Mobile invite code */}
                      <button
                        onClick={copyInviteCode}
                        className="sm:hidden mt-4 flex items-center justify-center gap-2 mx-auto px-4 py-2 text-xs font-mono tracking-wider text-accent bg-accent/5 border border-accent/20 rounded-lg"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Invite: {selectedPod.inviteCode}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {groupedMessages.map((msg, i) => {
                      const isMe = msg.user.id === currentUserId;
                      const prevMsg = groupedMessages[i - 1];
                      const showDateSep = i === 0 || (prevMsg && getDateLabel(msg.createdAt) !== getDateLabel(prevMsg.createdAt));

                      return (
                        <div key={msg.id}>
                          {/* Date separator */}
                          {showDateSep && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-slate-100" />
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{getDateLabel(msg.createdAt)}</span>
                              <div className="flex-1 h-px bg-slate-100" />
                            </div>
                          )}

                          {/* Message row — Discord style */}
                          <div className={`flex gap-3 hover:bg-slate-50/50 rounded-lg px-2 py-0.5 transition-colors group ${msg.isGroupStart ? 'mt-3' : 'mt-0'}`}>
                            {/* Avatar column */}
                            <div className="w-10 flex-shrink-0">
                              {msg.isGroupStart ? (
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(msg.user.name)} flex items-center justify-center text-white text-sm font-bold shadow-sm`}>
                                  {getInitials(msg.user.name)}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity leading-[22px] block text-center">
                                  {formatTimeFull(msg.createdAt)}
                                </span>
                              )}
                            </div>

                            {/* Content column */}
                            <div className="flex-1 min-w-0">
                              {msg.isGroupStart && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className={`text-sm font-bold ${isMe ? 'text-accent' : 'text-primary'}`}>
                                    {isMe ? 'You' : msg.user.name}
                                  </span>
                                  <span className="text-[10px] text-slate-300">{formatTimeFull(msg.createdAt)}</span>
                                </div>
                              )}
                              <div className="text-sm text-slate-700 leading-relaxed break-words">
                                {msg.type === 'essay_share' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-bold mr-2 mb-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Shared Essay
                                  </span>
                                )}
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* ─── Message input bar (Slack-style) ─── */}
              <div className="px-4 lg:px-5 pb-4 lg:pb-5 pt-1 flex-shrink-0">
                <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all shadow-sm">
                  {/* Attachment placeholder */}
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0" title="Attach file">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={`Message #${selectedPod.name.toLowerCase().replace(/\s+/g, '-')}...`}
                    className="flex-1 py-1.5 text-sm bg-transparent focus:outline-none placeholder-slate-400"
                  />
                  {/* Emoji placeholder */}
                  <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0" title="Add emoji">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                  {/* Send */}
                  <button
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending}
                    className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                      messageText.trim()
                        ? 'text-white bg-accent hover:bg-accent/90 shadow-sm'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] text-slate-300 mt-1.5 px-1">Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono">Enter</kbd> to send</p>
              </div>
            </div>
          ) : (
            /* ─── Empty state — no pod selected ─── */
            <div className="hidden lg:flex items-center justify-center h-full bg-slate-50/30">
              <div className="text-center max-w-sm px-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 to-purple-100 flex items-center justify-center mb-5">
                  <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold font-display text-primary mb-2">Select a Pod</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Choose a study pod from the sidebar to start chatting. Share essay drafts, give feedback, and grow together with your peers.
                </p>
                <div className="flex flex-col gap-3 text-left bg-white rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span><strong className="text-primary">Create</strong> a pod and invite friends with a code</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span><strong className="text-primary">Share</strong> essay drafts for peer review</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    </div>
                    <span><strong className="text-primary">Discuss</strong> college strategy with your peers</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
