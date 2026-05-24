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
  parentId?: string | null;
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

interface PodDoc {
  id: string;
  podId: string;
  uploaderId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content?: string;
  fileData?: string;
  createdAt: string;
  uploader: { id: string; name: string };
  _count?: { comments: number };
  comments?: DocComment[];
}

interface DocComment {
  id: string;
  documentId: string;
  userId: string;
  content: string;
  section: string;
  parentId: string | null;
  createdAt: string;
  user: { id: string; name: string };
  replies?: DocComment[];
}

interface StudySession {
  id: string;
  podId: string;
  creatorId: string;
  title: string;
  focusDuration: number;
  breakDuration: number;
  rounds: number;
  status: string;
  currentRound: number;
  startedAt: string | null;
  endsAt: string | null;
  createdAt: string;
  creator: { id: string; name: string };
  participants: SessionParticipant[];
  _count?: { participants: number };
}

interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  goal: string;
  completed: boolean;
  joinedAt: string;
  user: { id: string; name: string };
}

interface PodPoll {
  id: string;
  podId: string;
  creatorId: string;
  question: string;
  options: string;
  createdAt: string;
  creator: { id: string; name: string };
  votes: { userId: string; optionIdx: number }[];
}

interface MemberStats {
  id: string;
  podId: string;
  userId: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  messagesCount: number;
  sessionsCount: number;
  reactionsGiven: number;
  docsShared: number;
  pollsVoted: number;
  achievements: string;
  user?: { id: string; name: string };
}

interface PodActivityItem {
  id: string;
  podId: string;
  userId: string;
  type: string;
  metadata: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface AchievementDef {
  id: string;
  label: string;
  desc: string;
  icon: string;
  threshold: Record<string, number>;
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

  // Tabs
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'focus' | 'leaderboard'>('chat');
  const [documents, setDocuments] = useState<PodDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PodDoc | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline document editor overlay
  const [editorDoc, setEditorDoc] = useState<PodDoc | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);

  // Focus Sessions (Pomodoro)
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Focus Session');
  const [sessionFocusDuration, setSessionFocusDuration] = useState(25);
  const [sessionBreakDuration, setSessionBreakDuration] = useState(5);
  const [sessionRounds, setSessionRounds] = useState(4);
  const [sessionGoal, setSessionGoal] = useState('');
  const [timerDisplay, setTimerDisplay] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Message reactions (persisted)
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);

  // Engagement: Streaks, XP, Leaderboard, Polls, Activity
  const [myStats, setMyStats] = useState<MemberStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<MemberStats[]>([]);
  const [achievementDefs, setAchievementDefs] = useState<AchievementDef[]>([]);
  const [pods_polls, setPodsPolls] = useState<PodPoll[]>([]);
  const [podActivities, setPodActivities] = useState<PodActivityItem[]>([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [replyToMsg, setReplyToMsg] = useState<PodMessage | null>(null);

  // Text selection commenting
  const [selectedText, setSelectedText] = useState('');
  const [showSelectionComment, setShowSelectionComment] = useState(false);
  const [selectionCommentText, setSelectionCommentText] = useState('');
  const textContentRef = useRef<HTMLDivElement>(null);

  // Document modal zoom
  const [docZoom, setDocZoom] = useState(100);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUserId = (session?.user as any)?.id || '';
  const currentUserName = session?.user?.name || 'You';

  // Quick reaction emojis
  const QUICK_REACTIONS = ['👍', '❤️', '🔥', '👏', '💯', '😂', '🎯', '✨'];

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

  /* ─── Document Collaboration Hub functions ─── */
  const loadDocuments = useCallback(async (podId: string) => {
    setDocLoading(true);
    try {
      const r = await fetch(`/api/pod-documents?podId=${podId}`);
      const data = await r.json();
      setDocuments(data.documents || []);
    } catch { /* ignore */ }
    setDocLoading(false);
  }, []);

  const loadDocument = useCallback(async (docId: string) => {
    try {
      const r = await fetch(`/api/pod-documents?documentId=${docId}`);
      const data = await r.json();
      if (data.document) setSelectedDoc(data.document);
    } catch { /* ignore */ }
  }, []);

  // Always load documents when a pod is selected (needed for chat doc cards)
  useEffect(() => {
    if (selectedPod) {
      loadDocuments(selectedPod.id);
    }
  }, [selectedPod, loadDocuments]);

  /* ─── Focus Sessions functions ─── */
  const loadSessions = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-sessions?podId=${podId}`);
      const data = await r.json();
      setSessions(data.sessions || []);
    } catch { /* ignore */ }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch(`/api/pod-sessions?podId=${selectedPod?.id}&sessionId=${sessionId}`);
      const data = await r.json();
      if (data.session) setSelectedSession(data.session);
    } catch { /* ignore */ }
  }, [selectedPod]);

  useEffect(() => {
    if (selectedPod && activeTab === 'focus') {
      loadSessions(selectedPod.id);
    }
  }, [selectedPod, activeTab, loadSessions]);

  /* ─── Engagement data loading ─── */
  const loadReactions = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=reactions&podId=${podId}`);
      const data = await r.json();
      if (data.reactions) setMessageReactions(data.reactions);
    } catch { /* ignore */ }
  }, []);

  const loadMyStats = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=my-stats&podId=${podId}`);
      const data = await r.json();
      if (data.stats) setMyStats(data.stats);
      if (data.achievements) setAchievementDefs(data.achievements);
    } catch { /* ignore */ }
  }, []);

  const loadLeaderboard = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=leaderboard&podId=${podId}`);
      const data = await r.json();
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch { /* ignore */ }
  }, []);

  const loadPolls = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=polls&podId=${podId}`);
      const data = await r.json();
      if (data.polls) setPodsPolls(data.polls);
    } catch { /* ignore */ }
  }, []);

  const loadActivities = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=activity&podId=${podId}`);
      const data = await r.json();
      if (data.activities) setPodActivities(data.activities);
    } catch { /* ignore */ }
  }, []);

  // Load engagement data when a pod is selected
  useEffect(() => {
    if (selectedPod) {
      loadReactions(selectedPod.id);
      loadMyStats(selectedPod.id);
      loadPolls(selectedPod.id);
    }
  }, [selectedPod, loadReactions, loadMyStats, loadPolls]);

  // Load leaderboard when tab switches
  useEffect(() => {
    if (selectedPod && activeTab === 'leaderboard') {
      loadLeaderboard(selectedPod.id);
      loadActivities(selectedPod.id);
    }
  }, [selectedPod, activeTab, loadLeaderboard, loadActivities]);

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!selectedSession || !selectedSession.endsAt || selectedSession.status === 'waiting' || selectedSession.status === 'completed') {
      setTimerDisplay('');
      return;
    }
    const tick = () => {
      const now = Date.now();
      const end = new Date(selectedSession.endsAt!).getTime();
      const diff = Math.max(0, end - now);
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimerDisplay(`${mins}:${secs.toString().padStart(2, '0')}`);
      if (diff <= 0) {
        setTimerDisplay('0:00');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [selectedSession]);

  // Auto-refresh active session
  useEffect(() => {
    if (selectedSession && (selectedSession.status === 'active' || selectedSession.status === 'break')) {
      const interval = setInterval(() => loadSession(selectedSession.id), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedSession, loadSession]);

  const createSession = async () => {
    if (!selectedPod) return;
    try {
      const r = await fetch('/api/pod-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          podId: selectedPod.id,
          title: sessionTitle,
          focusDuration: sessionFocusDuration,
          breakDuration: sessionBreakDuration,
          rounds: sessionRounds,
          goal: sessionGoal,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setShowCreateSession(false);
        setSessionTitle('Focus Session');
        setSessionGoal('');
        loadSessions(selectedPod.id);
        if (data.session) {
          loadSession(data.session.id);
        }
      }
    } catch { /* ignore */ }
  };

  const joinSession = async (sessionId: string) => {
    try {
      await fetch('/api/pod-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', sessionId, goal: sessionGoal }),
      });
      setSessionGoal('');
      loadSession(sessionId);
      if (selectedPod) loadSessions(selectedPod.id);
    } catch { /* ignore */ }
  };

  const startSession = async (sessionId: string) => {
    try {
      await fetch('/api/pod-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', sessionId }),
      });
      loadSession(sessionId);
      if (selectedPod) loadSessions(selectedPod.id);
    } catch { /* ignore */ }
  };

  const advanceSession = async (sessionId: string) => {
    try {
      await fetch('/api/pod-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', sessionId }),
      });
      loadSession(sessionId);
      if (selectedPod) loadSessions(selectedPod.id);
    } catch { /* ignore */ }
  };

  const toggleGoalComplete = async (sessionId: string) => {
    try {
      await fetch('/api/pod-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete-goal', sessionId }),
      });
      loadSession(sessionId);
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPod) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File must be under 5MB');
      return;
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg', 'image/gif'];

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      pdf: 'pdf', txt: 'txt', doc: 'doc', docx: 'docx',
      png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
    };
    const fileType = typeMap[ext] || 'txt';

    setUploading(true);
    setError('');

    try {
      // Read file as base64
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // For text files, also extract text content
      let content = '';
      if (fileType === 'txt') {
        const textReader = new FileReader();
        content = await new Promise<string>((resolve, reject) => {
          textReader.onload = () => resolve(textReader.result as string);
          textReader.onerror = reject;
          textReader.readAsText(file);
        });
      }

      const r = await fetch('/api/pod-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload',
          podId: selectedPod.id,
          fileName: file.name,
          fileType,
          fileSize: file.size,
          content,
          fileData,
        }),
      });

      if (r.ok) {
        loadDocuments(selectedPod.id);
        loadMessages(selectedPod.id);
      } else {
        const data = await r.json();
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Failed to upload file');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addComment = async (documentId: string, parentId?: string) => {
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    try {
      const r = await fetch('/api/pod-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          documentId,
          content: text,
          parentId: parentId || null,
        }),
      });
      if (r.ok) {
        if (parentId) { setReplyText(''); setReplyingTo(null); }
        else setCommentText('');
        loadDocument(documentId);
      }
    } catch { /* ignore */ }
  };

  const deleteDocument = async (docId: string) => {
    try {
      await fetch('/api/pod-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      });
      setSelectedDoc(null);
      if (selectedPod) loadDocuments(selectedPod.id);
    } catch { /* ignore */ }
  };

  const deleteComment = async (commentId: string, documentId: string) => {
    try {
      await fetch('/api/pod-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
      loadDocument(documentId);
    } catch { /* ignore */ }
  };

  /* ─── Inline editor functions ─── */
  const openDocEditor = useCallback(async (docId: string) => {
    try {
      const r = await fetch(`/api/pod-documents?documentId=${docId}`);
      const data = await r.json();
      if (data.document) {
        setEditorDoc(data.document);
        setEditorContent(data.document.content || '');
        setEditorDirty(false);
      }
    } catch { /* ignore */ }
  }, []);

  const closeDocEditor = () => {
    setEditorDoc(null);
    setEditorContent('');
    setEditorDirty(false);
    setCommentText('');
    setReplyingTo(null);
    setReplyText('');
  };

  const saveDocContent = async () => {
    if (!editorDoc || !editorDirty) return;
    setEditorSaving(true);
    try {
      const r = await fetch('/api/pod-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', documentId: editorDoc.id, content: editorContent }),
      });
      if (r.ok) {
        setEditorDirty(false);
        // Refresh the doc to get latest comments
        openDocEditor(editorDoc.id);
      }
    } catch { /* ignore */ }
    setEditorSaving(false);
  };

  // Poll comments while editor is open
  useEffect(() => {
    if (!editorDoc) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/pod-documents?documentId=${editorDoc.id}`);
        const data = await r.json();
        if (data.document) {
          setEditorDoc(prev => prev ? { ...prev, comments: data.document.comments } : null);
          // If content changed externally and we haven't modified it
          if (!editorDirty && data.document.content !== editorContent) {
            setEditorContent(data.document.content || '');
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [editorDoc?.id, editorDirty, editorContent, openDocEditor]);

  const addEditorComment = async (parentId?: string) => {
    if (!editorDoc) return;
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;
    try {
      const r = await fetch('/api/pod-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          documentId: editorDoc.id,
          content: text,
          parentId: parentId || null,
        }),
      });
      if (r.ok) {
        if (parentId) { setReplyText(''); setReplyingTo(null); }
        else setCommentText('');
        openDocEditor(editorDoc.id);
      }
    } catch { /* ignore */ }
  };

  const deleteEditorComment = async (commentId: string) => {
    if (!editorDoc) return;
    try {
      await fetch('/api/pod-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
      openDocEditor(editorDoc.id);
    } catch { /* ignore */ }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editorDoc) closeDocEditor();
        setShowReactionPicker(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editorDoc]);

  // Toggle reaction on a message (persisted)
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedPod) return;
    // Optimistic update
    setMessageReactions(prev => {
      const msgReactions = { ...(prev[messageId] || {}) };
      const users = msgReactions[emoji] ? [...msgReactions[emoji]] : [];
      const idx = users.indexOf(currentUserId);
      if (idx >= 0) users.splice(idx, 1);
      else users.push(currentUserId);
      if (users.length === 0) delete msgReactions[emoji];
      else msgReactions[emoji] = users;
      return { ...prev, [messageId]: msgReactions };
    });
    setShowReactionPicker(null);
    // Persist
    try {
      await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-reaction', podId: selectedPod.id, messageId, emoji }),
      });
      loadMyStats(selectedPod.id);
    } catch { /* optimistic is good enough */ }
  };

  // Create poll
  const createPoll = async () => {
    if (!selectedPod || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    try {
      await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-poll',
          podId: selectedPod.id,
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim()),
        }),
      });
      setShowCreatePoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      loadMessages(selectedPod.id);
      loadPolls(selectedPod.id);
    } catch { /* ignore */ }
  };

  // Vote on poll
  const votePoll = async (pollId: string, optionIdx: number) => {
    if (!selectedPod) return;
    try {
      const r = await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote-poll', podId: selectedPod.id, pollId, optionIdx }),
      });
      const data = await r.json();
      if (data.poll) {
        setPodsPolls(prev => prev.map(p => p.id === data.poll.id ? data.poll : p));
      }
      loadMyStats(selectedPod.id);
    } catch { /* ignore */ }
  };

  // Send threaded reply
  const sendReply = async () => {
    if (!messageText.trim() || !selectedPod || !replyToMsg || sending) return;
    setSending(true);
    try {
      const r = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', podId: selectedPod.id, content: messageText, parentId: replyToMsg.id }),
      });
      if (r.ok) {
        setMessageText('');
        setReplyToMsg(null);
        loadMessages(selectedPod.id);
        inputRef.current?.focus();
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  // Handle text selection for commenting
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
      setShowSelectionComment(true);
    }
  };

  const submitSelectionComment = async () => {
    if (!editorDoc || !selectionCommentText.trim()) return;
    try {
      const r = await fetch('/api/pod-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          documentId: editorDoc.id,
          content: selectionCommentText,
          section: selectedText,
          parentId: null,
        }),
      });
      if (r.ok) {
        setSelectionCommentText('');
        setSelectedText('');
        setShowSelectionComment(false);
        openDocEditor(editorDoc.id);
      }
    } catch { /* ignore */ }
  };

  // Find document by ID from the documents list (for chat card rendering)
  const getDocForMessage = useCallback((msg: PodMessage): PodDoc | undefined => {
    if (msg.type !== 'essay_share' || !msg.essayId) return undefined;
    return documents.find(d => d.id === msg.essayId);
  }, [documents]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
      case 'image': return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
      default: return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
    }
  };

  const getFileColor = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return 'from-red-500 to-rose-600';
      case 'image': return 'from-emerald-500 to-teal-600';
      case 'doc': case 'docx': return 'from-blue-500 to-indigo-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  // Drag-and-drop upload
  const [isDragging, setIsDragging] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

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
        <div className="grid h-full lg:grid-cols-[280px_1fr] gap-0 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

          {/* ═══════════════ CHANNEL SIDEBAR (Modern light) ═══════════════ */}
          <div className={`border-r border-slate-200 flex flex-col bg-white ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
            {/* Sidebar header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-sm shadow-accent/20">
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
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm shadow-accent/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Create
                </button>
                <button
                  onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Join
                </button>
              </div>
            </div>

            {/* Create dialog */}
            {showCreate && (
              <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-2">
                <input
                  type="text"
                  value={newPodName}
                  onChange={e => setNewPodName(e.target.value)}
                  placeholder="Pod name (e.g. Essay Review Squad)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
                  autoFocus
                />
                <textarea
                  value={newPodDesc}
                  onChange={e => setNewPodDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40 resize-none"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-primary rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={createPod} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-md hover:bg-accent/90 transition-colors">Create Pod</button>
                </div>
              </div>
            )}

            {/* Join dialog */}
            {showJoin && (
              <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  maxLength={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono tracking-wider text-center uppercase text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/40"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-primary rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={joinPod} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-md hover:bg-accent/90 transition-colors">Join Pod</button>
                </div>
              </div>
            )}

            {/* Pod / channel list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
              ) : pods.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/5 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-accent/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-600 mb-1">No pods yet</p>
                  <p className="text-xs text-slate-400">Create a pod or join one with an invite code.</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 mb-1">Your Pods</p>
                  {pods.map(pod => {
                    const isActive = selectedPod?.id === pod.id;
                    return (
                      <button
                        key={pod.id}
                        onClick={() => selectPod(pod)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl mb-0.5 transition-all group ${
                          isActive
                            ? 'bg-accent/10 text-accent border border-accent/20'
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(pod.name)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                            {pod.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-sm font-semibold truncate ${isActive ? 'text-accent' : 'text-primary'}`}>{pod.name}</p>
                              {pod.lastMessage && (
                                <span className="text-[10px] text-slate-300 flex-shrink-0">{formatTime(pod.lastMessage.createdAt)}</span>
                              )}
                            </div>
                            {pod.lastMessage && (
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {pod.lastMessage.userName}: {pod.lastMessage.content}
                              </p>
                            )}
                          </div>
                          {pod.memberCount > 1 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold flex-shrink-0">{pod.memberCount}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Sidebar footer — user info + streak */}
            <div className="p-3 border-t border-slate-100">
              {myStats && myStats.currentStreak > 0 && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-base">{myStats.currentStreak >= 7 ? '🔥' : '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-amber-600">{myStats.currentStreak}-day streak</p>
                      <p className="text-[10px] text-slate-400">{myStats.xp} XP</p>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (myStats.currentStreak / 30) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(currentUserName)} flex items-center justify-center text-white text-xs font-bold`}>
                    {getInitials(currentUserName)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-primary truncate">{currentUserName}</p>
                  <p className="text-[10px] text-emerald-500">Active</p>
                </div>
                {myStats && myStats.xp > 0 && (
                  <div className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                    {myStats.xp} XP
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════ CHAT AREA ═══════════════ */}
          {selectedPod ? (
            <div
              className={`relative flex flex-col h-full bg-white ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-accent/5 border-2 border-dashed border-accent rounded-r-2xl flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-accent">Drop file to upload</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, TXT, DOC, DOCX, or images up to 5MB</p>
                  </div>
                </div>
              )}
              {/* ─── Chat header ─── */}
              <div className="px-4 lg:px-5 py-3 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-3">
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
                    {/* Leave pod */}
                    {leaveConfirm ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => { leavePod(selectedPod.id); setLeaveConfirm(false); }} className="text-[11px] font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg bg-red-50">Leave</button>
                        <button onClick={() => setLeaveConfirm(false)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg bg-slate-50">Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setLeaveConfirm(true)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Leave pod"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* ─── Tab switcher: Chat | Files | Focus ─── */}
                <div className="flex gap-1 mt-3 -mx-4 lg:-mx-5 px-4 lg:px-5 border-b border-slate-100">
                  {[
                    { key: 'chat' as const, label: 'Chat', onClick: () => { setActiveTab('chat'); setSelectedDoc(null); }, badge: null },
                    { key: 'documents' as const, label: 'Files', onClick: () => setActiveTab('documents'), badge: documents.length > 0 ? documents.length : null },
                    { key: 'focus' as const, label: 'Focus', onClick: () => { setActiveTab('focus'); setSelectedSession(null); }, badge: sessions.filter(s => s.status !== 'completed').length > 0 ? sessions.filter(s => s.status !== 'completed').length : null },
                    { key: 'leaderboard' as const, label: 'Leaderboard', onClick: () => setActiveTab('leaderboard'), badge: null },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={tab.onClick}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px ${
                        activeTab === tab.key
                          ? 'border-accent text-accent'
                          : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      {tab.label}
                      {tab.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          activeTab === tab.key ? 'bg-accent/10 text-accent' : tab.key === 'focus' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ═══════════════ DOCUMENTS TAB (History view) ═══════════════ */}
              {activeTab === 'documents' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    {/* Upload zone */}
                    <div className="px-4 lg:px-5 pt-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-accent/40 hover:bg-accent/5 transition-all group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">Upload a document</p>
                          <p className="text-xs text-slate-400">Drag & drop or click to browse — PDF, TXT, DOC, DOCX, images up to 5MB</p>
                        </div>
                      </button>
                      {uploading && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <svg className="w-8 h-8 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-accent">Uploading...</p>
                            <div className="h-1.5 bg-accent/10 rounded-full mt-1.5 overflow-hidden">
                              <div className="h-full bg-accent rounded-full animate-pulse" style={{ width: '60%' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Document list */}
                    <div className="px-4 lg:px-5 py-4">
                      {docLoading ? (
                        <div className="text-center py-8 text-sm text-slate-400 animate-pulse">Loading documents...</div>
                      ) : documents.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-400">No documents shared yet. Upload one above to get started.</p>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {documents.map(doc => (
                            <button
                              key={doc.id}
                              onClick={() => openDocEditor(doc.id)}
                              className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-accent/20 hover:bg-accent/5 transition-all group flex items-center gap-3"
                            >
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getFileColor(doc.fileType)} flex items-center justify-center flex-shrink-0`}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(doc.fileType)} />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-primary truncate group-hover:text-accent transition-colors">{doc.fileName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-slate-400">{doc.uploader.name}</span>
                                  <span className="text-[10px] text-slate-300">&middot;</span>
                                  <span className="text-[10px] text-slate-400">{formatFileSize(doc.fileSize)}</span>
                                  <span className="text-[10px] text-slate-300">&middot;</span>
                                  <span className="text-[10px] text-slate-400">{formatTime(doc.createdAt)}</span>
                                </div>
                              </div>
                              {doc._count && doc._count.comments > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-accent flex-shrink-0">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  <span className="text-[10px] font-semibold">{doc._count.comments}</span>
                                </div>
                              )}
                              <svg className="w-4 h-4 text-slate-300 group-hover:text-accent flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════ FOCUS TAB ═══════════════ */}
              {activeTab === 'focus' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {selectedSession ? (
                    /* ─── Session detail view ─── */
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Session header */}
                      <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => setSelectedSession(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-white transition-all flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-primary truncate">{selectedSession.title}</p>
                            <p className="text-[10px] text-slate-400">
                              by {selectedSession.creator.name} &middot; {selectedSession.focusDuration}m focus / {selectedSession.breakDuration}m break &middot; {selectedSession.rounds} rounds
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                            selectedSession.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                            selectedSession.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            selectedSession.status === 'break' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {selectedSession.status === 'waiting' ? 'Waiting' :
                             selectedSession.status === 'active' ? `Round ${selectedSession.currentRound}/${selectedSession.rounds}` :
                             selectedSession.status === 'break' ? 'Break' : 'Completed'}
                          </span>
                        </div>
                      </div>

                      {/* Timer display */}
                      <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-6">
                        {(selectedSession.status === 'active' || selectedSession.status === 'break') && (
                          <div className="text-center mb-6">
                            <div className={`inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-4 ${
                              selectedSession.status === 'active' ? 'border-emerald-400 bg-emerald-50' : 'border-blue-400 bg-blue-50'
                            }`}>
                              <span className="text-4xl font-bold font-display text-primary">{timerDisplay || '--:--'}</span>
                              <span className={`text-xs font-semibold mt-1 ${
                                selectedSession.status === 'active' ? 'text-emerald-600' : 'text-blue-600'
                              }`}>
                                {selectedSession.status === 'active' ? 'Focus Time' : 'Break Time'}
                              </span>
                            </div>
                            {selectedSession.creatorId === currentUserId && (
                              <div className="mt-4">
                                <button
                                  onClick={() => advanceSession(selectedSession.id)}
                                  className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-all shadow-sm"
                                >
                                  {selectedSession.status === 'active' && selectedSession.currentRound >= selectedSession.rounds
                                    ? 'Complete Session'
                                    : selectedSession.status === 'active'
                                    ? 'Start Break'
                                    : 'Start Next Round'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedSession.status === 'waiting' && (
                          <div className="text-center mb-6">
                            <div className="inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-4 border-amber-300 bg-amber-50">
                              <svg className="w-10 h-10 text-amber-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-semibold text-amber-600">Waiting to start</span>
                            </div>
                            {selectedSession.creatorId === currentUserId && (
                              <div className="mt-4">
                                <button
                                  onClick={() => startSession(selectedSession.id)}
                                  className="px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-all shadow-sm"
                                >
                                  Start Session
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedSession.status === 'completed' && (
                          <div className="text-center mb-6">
                            <div className="inline-flex flex-col items-center justify-center w-40 h-40 rounded-full border-4 border-slate-200 bg-slate-50">
                              <svg className="w-10 h-10 text-emerald-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs font-semibold text-slate-500">Session Complete</span>
                            </div>
                          </div>
                        )}

                        {/* Participants */}
                        <div className="mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Participants — {selectedSession.participants?.length || 0}
                          </p>
                          <div className="space-y-2">
                            {selectedSession.participants?.map(p => (
                              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(p.user.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                                  {getInitials(p.user.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-primary">{p.user.name}</p>
                                  {p.goal && <p className="text-[10px] text-slate-400 truncate">{p.goal}</p>}
                                </div>
                                {p.userId === currentUserId && selectedSession.status !== 'completed' && (
                                  <button
                                    onClick={() => toggleGoalComplete(selectedSession.id)}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      p.completed
                                        ? 'text-emerald-500 bg-emerald-50'
                                        : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'
                                    }`}
                                    title={p.completed ? 'Mark incomplete' : 'Mark complete'}
                                  >
                                    <svg className="w-4 h-4" fill={p.completed ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                )}
                                {p.userId !== currentUserId && p.completed && (
                                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Join button if not already a participant */}
                          {selectedSession.status !== 'completed' &&
                           !selectedSession.participants?.some(p => p.userId === currentUserId) && (
                            <div className="mt-4 space-y-2">
                              <input
                                type="text"
                                value={sessionGoal}
                                onChange={e => setSessionGoal(e.target.value)}
                                placeholder="What will you work on? (optional)"
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                              />
                              <button
                                onClick={() => joinSession(selectedSession.id)}
                                className="w-full px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-all"
                              >
                                Join Session
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : showCreateSession ? (
                    /* ─── Create session form ─── */
                    <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-5">
                      <div className="max-w-sm mx-auto space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => setShowCreateSession(false)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <h4 className="text-sm font-bold text-primary">New Focus Session</h4>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Title</label>
                          <input
                            type="text"
                            value={sessionTitle}
                            onChange={e => setSessionTitle(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Focus (min)</label>
                            <input
                              type="number"
                              value={sessionFocusDuration}
                              onChange={e => setSessionFocusDuration(Math.max(1, parseInt(e.target.value) || 1))}
                              min={1}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Break (min)</label>
                            <input
                              type="number"
                              value={sessionBreakDuration}
                              onChange={e => setSessionBreakDuration(Math.max(1, parseInt(e.target.value) || 1))}
                              min={1}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rounds</label>
                            <input
                              type="number"
                              value={sessionRounds}
                              onChange={e => setSessionRounds(Math.max(1, parseInt(e.target.value) || 1))}
                              min={1}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Goal (optional)</label>
                          <input
                            type="text"
                            value={sessionGoal}
                            onChange={e => setSessionGoal(e.target.value)}
                            placeholder="e.g. Finish Common App essay draft"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => setShowCreateSession(false)}
                            className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={createSession}
                            className="flex-1 px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-all shadow-sm"
                          >
                            Create Session
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ─── Sessions list ─── */
                    <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4">
                      {/* Create button */}
                      <button
                        onClick={() => setShowCreateSession(true)}
                        className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Focus Session
                      </button>

                      {sessions.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-bold text-primary mb-1">No Focus Sessions Yet</h4>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">Start a Pomodoro focus session and study together with your pod members in real time.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sessions.map(s => {
                            const isActive = s.status === 'active' || s.status === 'break';
                            const participantCount = s._count?.participants || s.participants?.length || 0;
                            return (
                              <button
                                key={s.id}
                                onClick={() => loadSession(s.id)}
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                                  isActive
                                    ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300'
                                    : s.status === 'waiting'
                                    ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300'
                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                } hover:shadow-sm`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-primary truncate">{s.title}</p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                                    s.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                    s.status === 'break' ? 'bg-blue-100 text-blue-700' :
                                    s.status === 'waiting' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {s.status === 'active' ? `Round ${s.currentRound}/${s.rounds}` :
                                     s.status === 'break' ? 'Break' :
                                     s.status === 'waiting' ? 'Waiting' : 'Done'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] text-slate-400">
                                    {s.focusDuration}m/{s.breakDuration}m x{s.rounds}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {participantCount} {participantCount === 1 ? 'person' : 'people'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 ml-auto">
                                    {formatTime(s.createdAt)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════ LEADERBOARD TAB ═══════════════ */}
              {activeTab === 'leaderboard' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 lg:px-5 py-4 space-y-5">
                    {/* My stats card */}
                    {myStats && (
                      <div className="bg-gradient-to-br from-accent/5 to-purple-500/5 rounded-2xl border border-accent/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-primary">Your Stats</h4>
                          <div className="flex items-center gap-1.5">
                            {myStats.currentStreak > 0 && (
                              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                {myStats.currentStreak >= 7 ? '🔥' : '⚡'} {myStats.currentStreak}-day streak
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-center">
                          <div>
                            <p className="text-xl font-bold font-display text-accent">{myStats.xp}</p>
                            <p className="text-[10px] text-slate-400">XP</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold font-display text-primary">{myStats.messagesCount}</p>
                            <p className="text-[10px] text-slate-400">Messages</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold font-display text-primary">{myStats.sessionsCount}</p>
                            <p className="text-[10px] text-slate-400">Sessions</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold font-display text-primary">{myStats.longestStreak}</p>
                            <p className="text-[10px] text-slate-400">Best Streak</p>
                          </div>
                        </div>
                        {/* Achievements */}
                        {(() => {
                          const unlocked: string[] = JSON.parse(myStats.achievements || '[]');
                          return unlocked.length > 0 ? (
                            <div className="mt-3 pt-3 border-t border-accent/10">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Achievements</p>
                              <div className="flex flex-wrap gap-2">
                                {achievementDefs.filter(a => unlocked.includes(a.id)).map(a => (
                                  <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-slate-100 shadow-sm" title={a.desc}>
                                    <span className="text-sm">{a.icon}</span>
                                    <span className="text-[10px] font-semibold text-primary">{a.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* Leaderboard */}
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-3">Pod Rankings</h4>
                      <div className="space-y-1.5">
                        {leaderboard.map((entry, i) => {
                          const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                          const isMe = entry.userId === currentUserId;
                          return (
                            <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isMe ? 'bg-accent/5 border border-accent/10' : 'bg-white border border-slate-100'}`}>
                              <div className="w-7 text-center">
                                {rankIcon ? <span className="text-base">{rankIcon}</span> : <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                              </div>
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(entry.user?.name || '')} flex items-center justify-center text-white text-xs font-bold`}>
                                {getInitials(entry.user?.name || '?')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isMe ? 'text-accent' : 'text-primary'}`}>
                                  {entry.user?.name || 'Unknown'} {isMe && <span className="text-[10px] text-accent/60">(you)</span>}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {entry.currentStreak > 0 && (
                                    <span className="text-[10px] text-amber-500 font-semibold">{entry.currentStreak >= 7 ? '🔥' : '⚡'} {entry.currentStreak}d</span>
                                  )}
                                  <span className="text-[10px] text-slate-400">{entry.messagesCount} msgs</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-accent">{entry.xp}</p>
                                <p className="text-[10px] text-slate-400">XP</p>
                              </div>
                            </div>
                          );
                        })}
                        {leaderboard.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-3xl mb-2">🏆</p>
                            <p className="text-sm text-slate-500">Send messages and complete sessions to earn XP!</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity Feed */}
                    {podActivities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-primary mb-3">Recent Activity</h4>
                        <div className="space-y-2">
                          {podActivities.slice(0, 10).map(a => {
                            const meta = JSON.parse(a.metadata || '{}');
                            const activityText: Record<string, string> = {
                              poll_created: `created a poll: "${meta.question || ''}"`,
                              session_started: 'started a focus session',
                              doc_shared: `shared a document: ${meta.fileName || ''}`,
                            };
                            return (
                              <div key={a.id} className="flex items-start gap-2.5 px-3 py-2 bg-slate-50 rounded-lg">
                                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getAvatarColor(a.user.name)} flex items-center justify-center text-white text-[8px] font-bold mt-0.5`}>
                                  {getInitials(a.user.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-600">
                                    <span className="font-semibold text-primary">{a.user.name}</span>{' '}
                                    {activityText[a.type] || a.type}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(a.createdAt)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* All Achievements (locked + unlocked) */}
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-3">All Achievements</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {achievementDefs.map(a => {
                          const unlocked = myStats ? JSON.parse(myStats.achievements || '[]').includes(a.id) : false;
                          return (
                            <div key={a.id} className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${unlocked ? 'bg-white border-accent/20 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                              <span className="text-xl">{a.icon}</span>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold ${unlocked ? 'text-primary' : 'text-slate-400'}`}>{a.label}</p>
                                <p className="text-[10px] text-slate-400 truncate">{a.desc}</p>
                              </div>
                              {unlocked && <span className="ml-auto text-emerald-500 text-sm">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════ CHAT TAB ═══════════════ */}
              {activeTab === 'chat' && <>
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
                    <div className="text-center max-w-sm">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent/10 via-purple-100 to-indigo-50 flex items-center justify-center mb-5 shadow-sm">
                        <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-primary mb-2">Welcome to {selectedPod.name}!</h4>
                      <p className="text-sm text-slate-500 leading-relaxed mb-4">This is the beginning of your study pod. Share essay ideas, give feedback, or just say hi.</p>
                      <div className="flex flex-wrap justify-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-[11px] font-semibold">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Share docs
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-semibold">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Focus together
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[11px] font-semibold">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          React & vibe
                        </span>
                      </div>
                      {/* Mobile invite code */}
                      <button
                        onClick={copyInviteCode}
                        className="sm:hidden mt-2 flex items-center justify-center gap-2 mx-auto px-4 py-2 text-xs font-mono tracking-wider text-accent bg-accent/5 border border-accent/20 rounded-lg"
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
                            <div className="flex items-center gap-4 my-5">
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">{getDateLabel(msg.createdAt)}</span>
                              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                            </div>
                          )}

                          {/* Message row — Discord/Slack style */}
                          <div
                            className={`relative flex gap-3 hover:bg-accent/[0.02] rounded-lg px-2 py-1 transition-all group ${msg.isGroupStart ? 'mt-4' : 'mt-0.5'}`}
                            onMouseEnter={() => setHoveredMessage(msg.id)}
                            onMouseLeave={() => { setHoveredMessage(null); if (showReactionPicker === msg.id) setShowReactionPicker(null); }}
                          >
                            {/* Quick action toolbar (Slack-style hover) */}
                            {hoveredMessage === msg.id && (
                              <div className="absolute -top-3 right-3 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-md px-1 py-0.5 z-10">
                                <button
                                  onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
                                  title="Add reaction"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                                <button
                                  className="p-1.5 rounded-md text-slate-400 hover:text-accent hover:bg-accent/5 transition-all"
                                  title="Reply in thread"
                                  onClick={() => { setReplyToMsg(msg); inputRef.current?.focus(); }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>
                              </div>
                            )}

                            {/* Reaction picker popup */}
                            {showReactionPicker === msg.id && (
                              <div className="absolute -top-12 right-3 flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-lg px-2 py-1.5 z-20">
                                {QUICK_REACTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => toggleReaction(msg.id, emoji)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-slate-100 hover:scale-125 transition-all"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Avatar column */}
                            <div className="w-10 flex-shrink-0">
                              {msg.isGroupStart ? (
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(msg.user.name)} flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white`}>
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
                                  <span className="text-[10px] text-slate-400 font-medium">{formatTimeFull(msg.createdAt)}</span>
                                </div>
                              )}
                              <div className="text-sm text-slate-700 leading-relaxed break-words">
                                {(() => {
                                  const linkedDoc = getDocForMessage(msg);
                                  if (linkedDoc) {
                                    return (
                                      <button
                                        onClick={() => openDocEditor(linkedDoc.id)}
                                        className="w-full max-w-md mt-1 flex items-center gap-3 p-3.5 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 rounded-xl hover:border-accent/30 hover:shadow-lg transition-all text-left group/card"
                                      >
                                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getFileColor(linkedDoc.fileType)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(linkedDoc.fileType)} />
                                          </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-bold text-primary truncate group-hover/card:text-accent transition-colors">{linkedDoc.fileName}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">{linkedDoc.fileType}</span>
                                            <span className="text-[10px] text-slate-300">&middot;</span>
                                            <span className="text-[10px] text-slate-400">{formatFileSize(linkedDoc.fileSize)}</span>
                                            {linkedDoc._count && linkedDoc._count.comments > 0 && (
                                              <>
                                                <span className="text-[10px] text-slate-300">&middot;</span>
                                                <span className="text-[10px] text-accent font-semibold">{linkedDoc._count.comments} comment{linkedDoc._count.comments !== 1 ? 's' : ''}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex-shrink-0 px-3 py-1.5 bg-accent/5 text-accent text-[11px] font-bold rounded-lg group-hover/card:bg-accent group-hover/card:text-white transition-all">
                                          Open
                                        </div>
                                      </button>
                                    );
                                  }
                                  // Fallback for older messages without linked doc
                                  if (msg.type === 'essay_share') {
                                    return (
                                      <>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[11px] font-bold mr-2 mb-1">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                          Shared Document
                                        </span>
                                        {msg.content}
                                      </>
                                    );
                                  }
                                  // Poll card
                                  if (msg.type === 'poll' && msg.essayId) {
                                    const poll = pods_polls.find(p => p.id === msg.essayId);
                                    if (poll) {
                                      const options: string[] = JSON.parse(poll.options || '[]');
                                      const totalVotes = poll.votes.length;
                                      const myVote = poll.votes.find(v => v.userId === currentUserId);
                                      return (
                                        <div className="w-full max-w-md mt-1 p-3.5 bg-gradient-to-br from-white to-purple-50/30 border border-purple-200/50 rounded-xl">
                                          <p className="text-sm font-bold text-primary mb-2.5">{poll.question}</p>
                                          <div className="space-y-1.5">
                                            {options.map((opt, i) => {
                                              const voteCount = poll.votes.filter(v => v.optionIdx === i).length;
                                              const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                              const isMyVote = myVote?.optionIdx === i;
                                              return (
                                                <button
                                                  key={i}
                                                  onClick={() => votePoll(poll.id, i)}
                                                  className={`w-full relative overflow-hidden rounded-lg border p-2 text-left transition-all ${
                                                    isMyVote ? 'border-accent/40 bg-accent/5' : 'border-slate-200 hover:border-accent/20'
                                                  }`}
                                                >
                                                  <div className="absolute inset-0 bg-accent/10 rounded-lg" style={{ width: `${pct}%` }} />
                                                  <div className="relative flex items-center justify-between">
                                                    <span className={`text-xs ${isMyVote ? 'font-bold text-accent' : 'text-slate-700'}`}>{opt}</span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{pct}%</span>
                                                  </div>
                                                </button>
                                              );
                                            })}
                                          </div>
                                          <p className="text-[10px] text-slate-400 mt-2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
                                        </div>
                                      );
                                    }
                                  }
                                  return msg.content;
                                })()}
                              </div>

                              {/* Thread reply indicator */}
                              {msg.parentId && (() => {
                                const parent = messages.find(m => m.id === msg.parentId);
                                return parent ? (
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                    <span>replying to <span className="font-semibold text-slate-500">{parent.user.name}</span></span>
                                    <span className="text-slate-300 truncate max-w-[200px]">{parent.content}</span>
                                  </div>
                                ) : null;
                              })()}

                              {/* Reactions display */}
                              {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {Object.entries(messageReactions[msg.id]).map(([emoji, userIds]) => {
                                    const uids = userIds as string[];
                                    return (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(msg.id, emoji)}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                                        uids.includes(currentUserId)
                                          ? 'bg-accent/10 border-accent/30 text-accent'
                                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-accent/20 hover:bg-accent/5'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="font-semibold text-[10px]">{uids.length}</span>
                                    </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* ─── Message input bar (Premium Slack-style) ─── */}
              <div className="px-4 lg:px-5 pb-4 lg:pb-5 pt-2 flex-shrink-0">
                {/* Hidden file input for chat uploads */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  className="hidden"
                />
                {uploading && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 mb-3 bg-gradient-to-r from-accent/5 to-purple-50 border border-accent/20 rounded-xl text-xs text-accent font-semibold">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading file to pod...
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                {/* Reply indicator */}
                {replyToMsg && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/5 border border-accent/10 rounded-t-lg text-xs">
                    <span className="text-accent font-semibold">Replying to {replyToMsg.user.name}</span>
                    <span className="text-slate-400 truncate flex-1">{replyToMsg.content}</span>
                    <button onClick={() => setReplyToMsg(null)} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                )}
                {/* Poll creator */}
                {showCreatePoll && (
                  <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">Create a Poll</p>
                      <button onClick={() => setShowCreatePoll(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={pollQuestion}
                      onChange={e => setPollQuestion(e.target.value)}
                      placeholder="Ask a question..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                      autoFocus
                    />
                    {pollOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={e => {
                            const next = [...pollOptions];
                            next[i] = e.target.value;
                            setPollOptions(next);
                          }}
                          placeholder={`Option ${i + 1}`}
                          className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30"
                        />
                        {pollOptions.length > 2 && (
                          <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      {pollOptions.length < 6 && (
                        <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-accent hover:text-accent/80 font-semibold">
                          + Add option
                        </button>
                      )}
                      <button
                        onClick={createPoll}
                        disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                      >
                        Create Poll
                      </button>
                    </div>
                  </div>
                )}
                <div className={`flex items-end gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 focus-within:border-slate-500 focus-within:shadow-[0_0_0_4px_rgba(29,155,209,0.1)] transition-all ${replyToMsg ? 'rounded-t-none border-t-0' : ''}`}>
                  {/* Attachment button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 rounded-xl text-slate-400 hover:text-accent hover:bg-accent/5 transition-all flex-shrink-0 disabled:opacity-40"
                    title="Share a document"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </button>
                  {/* Poll button */}
                  <button
                    onClick={() => setShowCreatePoll(!showCreatePoll)}
                    className="p-2 rounded-xl text-slate-400 hover:text-accent hover:bg-accent/5 transition-all flex-shrink-0"
                    title="Create a poll"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        replyToMsg ? sendReply() : sendMessage();
                      }
                    }}
                    placeholder={replyToMsg ? `Reply to ${replyToMsg.user.name}...` : `Message #${selectedPod.name.toLowerCase().replace(/\s+/g, '-')}...`}
                    className="flex-1 py-1.5 text-sm bg-transparent focus:outline-none placeholder-slate-400"
                  />
                  {/* Send */}
                  <button
                    onClick={replyToMsg ? sendReply : sendMessage}
                    disabled={!messageText.trim() || sending}
                    className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                      messageText.trim()
                        ? 'text-white bg-accent hover:bg-accent/90 shadow-sm shadow-accent/20'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5 px-1">
                  <p className="text-[10px] text-slate-300">
                    <kbd className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded text-[9px] font-mono text-slate-400">Enter</kbd>
                    <span className="ml-1">to send</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{members.length} online</span>
                  </div>
                </div>
              </div>
              </>}

              {/* ═══════════════ DOCUMENT MODAL ═══════════════ */}
              {editorDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={closeDocEditor}>
                  {/* Backdrop */}
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

                  {/* Modal container */}
                  <div
                    className="relative w-[95vw] h-[90vh] max-w-7xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Modal header */}
                    <div className="px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 flex items-center justify-between gap-3 flex-shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getFileColor(editorDoc.fileType)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(editorDoc.fileType)} />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-primary truncate">{editorDoc.fileName}</p>
                          <p className="text-xs text-slate-400">
                            Shared by {editorDoc.uploader.name} &middot; {formatFileSize(editorDoc.fileSize)}
                            {editorDirty && <span className="ml-2 text-amber-500 font-semibold">Unsaved changes</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Live indicator */}
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] font-semibold text-emerald-700">Live</span>
                        </div>
                        {/* Zoom controls for PDFs/images */}
                        {(editorDoc.fileType === 'pdf' || editorDoc.fileType === 'image') && (
                          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <button
                              onClick={() => setDocZoom(z => Math.max(50, z - 25))}
                              className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-white transition-all text-xs font-bold"
                              title="Zoom out"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                            </button>
                            <span className="text-[11px] font-semibold text-slate-600 min-w-[3rem] text-center">{docZoom}%</span>
                            <button
                              onClick={() => setDocZoom(z => Math.min(200, z + 25))}
                              className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-white transition-all text-xs font-bold"
                              title="Zoom in"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <button
                              onClick={() => setDocZoom(100)}
                              className="px-2 py-1.5 rounded-md text-[10px] font-semibold text-slate-500 hover:text-primary hover:bg-white transition-all"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                        {(editorDoc.fileType === 'txt' || editorDoc.content) && editorDirty && (
                          <button
                            onClick={saveDocContent}
                            disabled={editorSaving}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {editorSaving ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            Save
                          </button>
                        )}
                        {editorDoc.fileData && (
                          <a
                            href={editorDoc.fileData}
                            download={editorDoc.fileName}
                            className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-all"
                            title="Download"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        )}
                        {editorDoc.uploaderId === currentUserId && (
                          <button
                            onClick={() => { deleteDocument(editorDoc.id); closeDocEditor(); }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            title="Delete document"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        {/* Close button */}
                        <button
                          onClick={closeDocEditor}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all ml-1"
                          title="Close (Esc)"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Tip bar for text selection */}
                    {(editorDoc.fileType === 'txt' || editorDoc.content) && (
                      <div className="px-5 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100/50 flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-indigo-600">
                          <strong>Tip:</strong> Select any text in the document to leave a comment on that specific section
                        </span>
                      </div>
                    )}

                    {/* Modal body — split view: content + comments */}
                    <div className="flex-1 flex overflow-hidden">
                      {/* Left: Document content/editor */}
                      <div className="flex-1 overflow-y-auto border-r border-slate-100 bg-white" ref={textContentRef}>
                        {editorDoc.fileType === 'txt' || (editorDoc.content && !editorDoc.fileData) ? (
                          /* Editable text content with selection support */
                          <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="text-xs font-semibold text-slate-600">Collaborative Editor</span>
                              </div>
                              {editorDoc.comments && editorDoc.comments.filter(c => c.section).length > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                  <span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-300" />
                                  <span className="text-xs font-medium text-amber-700">
                                    {editorDoc.comments.filter(c => c.section).length} annotation{editorDoc.comments.filter(c => c.section).length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Document with inline annotation highlights */}
                            {(() => {
                              const sectionComments = editorDoc.comments?.filter(c => c.section) || [];
                              const hasAnnotations = sectionComments.length > 0;

                              if (hasAnnotations && editorContent) {
                                // Render annotated view — highlights commented sections
                                const annotationColors = ['bg-amber-100 border-amber-300', 'bg-blue-100 border-blue-300', 'bg-green-100 border-green-300', 'bg-pink-100 border-pink-300', 'bg-purple-100 border-purple-300'];
                                let renderedContent = editorContent;
                                const highlights: { text: string; color: string; commentUser: string; commentContent: string }[] = [];

                                sectionComments.forEach((c, i) => {
                                  if (renderedContent.includes(c.section)) {
                                    highlights.push({
                                      text: c.section,
                                      color: annotationColors[i % annotationColors.length],
                                      commentUser: c.user.name,
                                      commentContent: c.content,
                                    });
                                  }
                                });

                                // Build annotated HTML
                                let html = editorContent;
                                highlights.forEach((h, i) => {
                                  const escapedText = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  html = html.replace(
                                    new RegExp(escapedText, 'g'),
                                    `<mark class="${h.color} border-b-2 px-0.5 rounded-sm cursor-pointer" title="${h.commentUser}: ${h.commentContent.replace(/"/g, '&quot;')}">${h.text}</mark>`
                                  );
                                });

                                return (
                                  <>
                                    <div
                                      className="w-full min-h-[500px] p-6 text-base text-slate-800 leading-[1.8] bg-white border border-slate-200 rounded-xl font-sans shadow-sm whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{ __html: html }}
                                      onMouseUp={handleTextSelection}
                                    />
                                    <div className="mt-2 flex items-center justify-between">
                                      <button
                                        onClick={() => {
                                          // Switch to edit mode by focusing the textarea
                                          const ta = document.getElementById('doc-editor-textarea');
                                          if (ta) { (ta as HTMLTextAreaElement).style.display = 'block'; ta.focus(); }
                                        }}
                                        className="text-xs text-slate-400 hover:text-accent font-medium flex items-center gap-1.5"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Switch to edit mode
                                      </button>
                                    </div>
                                    <textarea
                                      id="doc-editor-textarea"
                                      value={editorContent}
                                      onChange={e => { setEditorContent(e.target.value); setEditorDirty(true); }}
                                      onMouseUp={handleTextSelection}
                                      className="w-full min-h-[500px] p-6 text-base text-slate-800 leading-[1.8] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 resize-y font-sans shadow-sm mt-2 hidden"
                                      placeholder="Start writing or paste your content here..."
                                    />
                                  </>
                                );
                              }

                              return (
                                <textarea
                                  value={editorContent}
                                  onChange={e => { setEditorContent(e.target.value); setEditorDirty(true); }}
                                  onMouseUp={handleTextSelection}
                                  className="w-full min-h-[500px] p-6 text-base text-slate-800 leading-[1.8] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 resize-y font-sans shadow-sm"
                                  placeholder="Start writing or paste your content here..."
                                />
                              );
                            })()}

                            {/* Selection comment popup */}
                            {showSelectionComment && selectedText && (
                              <div className="mt-4 p-4 bg-white border-2 border-indigo-200 rounded-xl shadow-lg animate-in slide-in-from-top-2">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-indigo-700 mb-1.5">Comment on selection:</p>
                                    <div className="px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg mb-3">
                                      <p className="text-xs text-indigo-600 italic line-clamp-2">&ldquo;{selectedText}&rdquo;</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={selectionCommentText}
                                        onChange={e => setSelectionCommentText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitSelectionComment(); }}
                                        placeholder="Your feedback on this section..."
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                                        autoFocus
                                      />
                                      <button
                                        onClick={submitSelectionComment}
                                        disabled={!selectionCommentText.trim()}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
                                      >
                                        Post
                                      </button>
                                      <button
                                        onClick={() => { setShowSelectionComment(false); setSelectedText(''); setSelectionCommentText(''); }}
                                        className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : editorDoc.fileType === 'image' && editorDoc.fileData ? (
                          <div className="p-6 flex justify-center items-center min-h-full">
                            <div className="relative">
                              <img
                                src={editorDoc.fileData}
                                alt={editorDoc.fileName}
                                className="rounded-xl shadow-lg transition-transform duration-200"
                                style={{ transform: `scale(${docZoom / 100})`, transformOrigin: 'center center', maxWidth: '100%', maxHeight: '70vh' }}
                              />
                            </div>
                          </div>
                        ) : editorDoc.fileType === 'pdf' && editorDoc.fileData ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100/50 p-4">
                            <iframe
                              src={`${editorDoc.fileData}#zoom=${docZoom}&view=FitH`}
                              className="w-full h-full border-0 rounded-lg shadow-sm bg-white"
                              title={editorDoc.fileName}
                              style={{ minHeight: '100%' }}
                            />
                          </div>
                        ) : (
                          <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                            <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${getFileColor(editorDoc.fileType)} flex items-center justify-center mb-5 shadow-lg`}>
                              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(editorDoc.fileType)} />
                              </svg>
                            </div>
                            <p className="text-lg font-bold text-primary mb-2">{editorDoc.fileName}</p>
                            <p className="text-sm text-slate-400 mb-6">This file type can be downloaded to view</p>
                            {editorDoc.fileData && (
                              <a
                                href={editorDoc.fileData}
                                download={editorDoc.fileName}
                                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors shadow-md hover:shadow-lg"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download File
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Comments panel */}
                      <div className="w-80 lg:w-[26rem] flex flex-col bg-white overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-100">
                          <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Feedback
                            {editorDoc.comments && editorDoc.comments.length > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                                {editorDoc.comments.length}
                              </span>
                            )}
                            <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] text-emerald-600 font-semibold">Live</span>
                            </span>
                          </h4>
                        </div>

                        {/* Comment input */}
                        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(currentUserName)} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm`}>
                              {getInitials(currentUserName)}
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                              <input
                                type="text"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addEditorComment(); }}
                                placeholder="Leave feedback on this document..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 bg-white"
                              />
                              {commentText.trim() && (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => addEditorComment()}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors shadow-sm"
                                  >
                                    Post Comment
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Comments list */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                          {editorDoc.comments && editorDoc.comments.length > 0 ? (
                            editorDoc.comments.map(comment => (
                              <div key={comment.id} className="group bg-slate-50/80 rounded-xl p-3.5 hover:bg-slate-100/80 transition-colors">
                                <div className="flex gap-3">
                                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getAvatarColor(comment.user.name)} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5 shadow-sm`}>
                                    {getInitials(comment.user.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-primary">{comment.user.name}</span>
                                      <span className="text-[10px] text-slate-400">{formatTime(comment.createdAt)}</span>
                                      {comment.userId === currentUserId && (
                                        <button
                                          onClick={() => deleteEditorComment(comment.id)}
                                          className="ml-auto text-[10px] text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>

                                    {/* Show quoted section if present */}
                                    {comment.section && (
                                      <div className="mb-2 px-3 py-1.5 bg-indigo-50/70 border-l-3 border-indigo-300 rounded-r-md">
                                        <p className="text-[11px] text-indigo-600 italic line-clamp-2">&ldquo;{comment.section}&rdquo;</p>
                                      </div>
                                    )}

                                    <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>

                                    {/* Reply button */}
                                    <button
                                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                      className="mt-2 text-[11px] text-slate-400 hover:text-accent font-semibold transition-colors"
                                    >
                                      Reply
                                    </button>

                                    {/* Reply input */}
                                    {replyingTo === comment.id && (
                                      <div className="flex gap-2 mt-2.5">
                                        <input
                                          type="text"
                                          value={replyText}
                                          onChange={e => setReplyText(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') addEditorComment(comment.id); }}
                                          placeholder="Write a reply..."
                                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => addEditorComment(comment.id)}
                                          disabled={!replyText.trim()}
                                          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 transition-colors"
                                        >
                                          Reply
                                        </button>
                                      </div>
                                    )}

                                    {/* Threaded replies */}
                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-3 ml-1 pl-3 border-l-2 border-accent/20 space-y-2.5">
                                        {comment.replies.map(reply => (
                                          <div key={reply.id} className="group/reply flex gap-2">
                                            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getAvatarColor(reply.user.name)} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5`}>
                                              {getInitials(reply.user.name)}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-primary">{reply.user.name}</span>
                                                <span className="text-[9px] text-slate-400">{formatTime(reply.createdAt)}</span>
                                                {reply.userId === currentUserId && (
                                                  <button
                                                    onClick={() => deleteEditorComment(reply.id)}
                                                    className="text-[9px] text-slate-300 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-all"
                                                  >
                                                    Delete
                                                  </button>
                                                )}
                                              </div>
                                              <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{reply.content}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                </svg>
                              </div>
                              <p className="text-sm font-bold text-slate-500">No feedback yet</p>
                              <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] mx-auto">Be the first to leave feedback on this document</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
