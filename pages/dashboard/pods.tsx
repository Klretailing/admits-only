import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import DashboardLayout from '../../components/DashboardLayout';

interface PodSummary {
  id: string; name: string; description: string; inviteCode: string;
  memberCount: number; myRole: string;
  lastMessage: { content: string; userName: string; createdAt: string } | null;
  joinedAt: string;
}

interface PodMessage {
  id: string; podId: string; userId: string; content: string; type: string;
  essayId: string | null; parentId?: string | null; createdAt: string;
  user: { id: string; name: string };
}

interface PodMember {
  id: string; userId: string; role: string; joinedAt: string;
  user: { id: string; name: string; email: string };
}

interface PodDoc {
  id: string; podId: string; uploaderId: string; fileName: string;
  fileType: string; fileSize: number; content?: string; fileData?: string;
  createdAt: string; uploader: { id: string; name: string };
  _count?: { comments: number }; comments?: DocComment[];
}

interface DocComment {
  id: string; documentId: string; userId: string; content: string;
  section: string; parentId: string | null; createdAt: string;
  user: { id: string; name: string }; replies?: DocComment[];
}

interface StudySession {
  id: string; podId: string; creatorId: string; title: string;
  focusDuration: number; breakDuration: number; rounds: number;
  status: string; currentRound: number; startedAt: string | null;
  endsAt: string | null; createdAt: string;
  creator: { id: string; name: string };
  participants: SessionParticipant[];
  _count?: { participants: number };
}

interface SessionParticipant {
  id: string; sessionId: string; userId: string; goal: string;
  completed: boolean; joinedAt: string; user: { id: string; name: string };
}

interface PodPoll {
  id: string; podId: string; creatorId: string; question: string;
  options: string; createdAt: string;
  creator: { id: string; name: string };
  votes: { userId: string; optionIdx: number }[];
}

interface MemberStats {
  id: string; podId: string; userId: string; xp: number;
  currentStreak: number; longestStreak: number; messagesCount: number;
  sessionsCount: number; reactionsGiven: number; docsShared: number;
  pollsVoted: number; achievements: string;
  user?: { id: string; name: string };
}

interface PodActivityItem {
  id: string; podId: string; userId: string; type: string;
  metadata: string; createdAt: string; user: { id: string; name: string };
}

interface AchievementDef {
  id: string; label: string; desc: string; icon: string;
  threshold: Record<string, number>;
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-emerald-100 text-emerald-600',
  'bg-rose-100 text-rose-600',
  'bg-amber-100 text-amber-600',
  'bg-cyan-100 text-cyan-600',
  'bg-violet-100 text-violet-600',
  'bg-lime-100 text-lime-600',
  'bg-red-100 text-red-600',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const FILE_COLORS: Record<string, string> = {
  pdf: 'bg-red-100 text-red-600',
  image: 'bg-emerald-100 text-emerald-600',
  doc: 'bg-blue-100 text-blue-600',
  docx: 'bg-blue-100 text-blue-600',
  txt: 'bg-slate-100 text-slate-600',
};

function getFileColor(fileType: string): string {
  return FILE_COLORS[fileType] || 'bg-slate-100 text-slate-600';
}

function getFileIcon(fileType: string): string {
  switch (fileType) {
    case 'pdf': return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
    case 'image': return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    default: return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  }
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '👏', '💯', '😂', '🎯', '✨'];

function isUnread(lastMessage: PodSummary['lastMessage']): boolean {
  if (!lastMessage) return false;
  return Date.now() - new Date(lastMessage.createdAt).getTime() < 300000;
}

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

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const [newPodName, setNewPodName] = useState('');
  const [newPodDesc, setNewPodDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'focus' | 'leaderboard'>('chat');
  const [documents, setDocuments] = useState<PodDoc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PodDoc | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editorDoc, setEditorDoc] = useState<PodDoc | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);

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

  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);

  const [myStats, setMyStats] = useState<MemberStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<MemberStats[]>([]);
  const [achievementDefs, setAchievementDefs] = useState<AchievementDef[]>([]);
  const [pods_polls, setPodsPolls] = useState<PodPoll[]>([]);
  const [podActivities, setPodActivities] = useState<PodActivityItem[]>([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [replyToMsg, setReplyToMsg] = useState<PodMessage | null>(null);

  const [selectedText, setSelectedText] = useState('');
  const [showSelectionComment, setShowSelectionComment] = useState(false);
  const [selectionCommentText, setSelectionCommentText] = useState('');
  const textContentRef = useRef<HTMLDivElement>(null);

  const [docZoom, setDocZoom] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typingVisible, setTypingVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentUserId = (session?.user as any)?.id || '';
  const currentUserName = session?.user?.name || 'You';

  const loadPods = useCallback(async () => {
    try {
      const r = await fetch('/api/pods');
      const data = await r.json();
      setPods(data.pods || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadPods();
  }, [status, loadPods]);

  const loadMessages = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pods?action=messages&podId=${podId}`);
      const data = await r.json();
      setMessages(data.messages || []);
    } catch {}
  }, []);

  const loadMembers = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pods?action=members&podId=${podId}`);
      const data = await r.json();
      setMembers(data.members || []);
    } catch {}
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
      const body: any = { action: 'message', podId: selectedPod.id, content: messageText };
      if (replyToMsg) body.parentId = replyToMsg.id;
      const r = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        setMessageText('');
        setReplyToMsg(null);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = '40px';
        }
        loadMessages(selectedPod.id);
        textareaRef.current?.focus();
        setTypingVisible(true);
        setTimeout(() => setTypingVisible(false), 2000);
      }
    } catch {}
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
    } catch {}
  };

  const copyInviteCode = () => {
    if (selectedPod) {
      navigator.clipboard.writeText(selectedPod.inviteCode);
      setShowInvite(true);
      setTimeout(() => setShowInvite(false), 2000);
    }
  };

  const loadDocuments = useCallback(async (podId: string) => {
    setDocLoading(true);
    try {
      const r = await fetch(`/api/pod-documents?podId=${podId}`);
      const data = await r.json();
      setDocuments(data.documents || []);
    } catch {}
    setDocLoading(false);
  }, []);

  const loadDocument = useCallback(async (docId: string) => {
    try {
      const r = await fetch(`/api/pod-documents?documentId=${docId}`);
      const data = await r.json();
      if (data.document) setSelectedDoc(data.document);
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedPod) loadDocuments(selectedPod.id);
  }, [selectedPod, loadDocuments]);

  const loadSessions = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-sessions?podId=${podId}`);
      const data = await r.json();
      setSessions(data.sessions || []);
    } catch {}
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const r = await fetch(`/api/pod-sessions?podId=${selectedPod?.id}&sessionId=${sessionId}`);
      const data = await r.json();
      if (data.session) setSelectedSession(data.session);
    } catch {}
  }, [selectedPod]);

  useEffect(() => {
    if (selectedPod && activeTab === 'focus') loadSessions(selectedPod.id);
  }, [selectedPod, activeTab, loadSessions]);

  const loadReactions = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=reactions&podId=${podId}`);
      const data = await r.json();
      if (data.reactions) setMessageReactions(data.reactions);
    } catch {}
  }, []);

  const loadMyStats = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=my-stats&podId=${podId}`);
      const data = await r.json();
      if (data.stats) setMyStats(data.stats);
      if (data.achievements) setAchievementDefs(data.achievements);
    } catch {}
  }, []);

  const loadLeaderboard = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=leaderboard&podId=${podId}`);
      const data = await r.json();
      if (data.leaderboard) setLeaderboard(data.leaderboard);
    } catch {}
  }, []);

  const loadPolls = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=polls&podId=${podId}`);
      const data = await r.json();
      if (data.polls) setPodsPolls(data.polls);
    } catch {}
  }, []);

  const loadActivities = useCallback(async (podId: string) => {
    try {
      const r = await fetch(`/api/pod-engage?action=activity&podId=${podId}`);
      const data = await r.json();
      if (data.activities) setPodActivities(data.activities);
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedPod) {
      loadReactions(selectedPod.id);
      loadMyStats(selectedPod.id);
      loadPolls(selectedPod.id);
    }
  }, [selectedPod, loadReactions, loadMyStats, loadPolls]);

  useEffect(() => {
    if (selectedPod && activeTab === 'leaderboard') {
      loadLeaderboard(selectedPod.id);
      loadActivities(selectedPod.id);
    }
  }, [selectedPod, activeTab, loadLeaderboard, loadActivities]);

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
          action: 'create', podId: selectedPod.id, title: sessionTitle,
          focusDuration: sessionFocusDuration, breakDuration: sessionBreakDuration,
          rounds: sessionRounds, goal: sessionGoal,
        }),
      });
      const data = await r.json();
      if (r.ok) {
        setShowCreateSession(false);
        setSessionTitle('Focus Session');
        setSessionGoal('');
        loadSessions(selectedPod.id);
        if (data.session) loadSession(data.session.id);
      }
    } catch {}
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
    } catch {}
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
    } catch {}
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
    } catch {}
  };

  const toggleGoalComplete = async (sessionId: string) => {
    try {
      await fetch('/api/pod-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete-goal', sessionId }),
      });
      loadSession(sessionId);
    } catch {}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPod) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { setError('File must be under 5MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, string> = {
      pdf: 'pdf', txt: 'txt', doc: 'doc', docx: 'docx',
      png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
    };
    const fileType = typeMap[ext] || 'txt';
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
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
        body: JSON.stringify({ action: 'upload', podId: selectedPod.id, fileName: file.name, fileType, fileSize: file.size, content, fileData }),
      });
      if (r.ok) { loadDocuments(selectedPod.id); loadMessages(selectedPod.id); }
      else { const data = await r.json(); setError(data.error || 'Upload failed'); }
    } catch { setError('Failed to upload file'); }
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
        body: JSON.stringify({ action: 'comment', documentId, content: text, parentId: parentId || null }),
      });
      if (r.ok) {
        if (parentId) { setReplyText(''); setReplyingTo(null); }
        else setCommentText('');
        loadDocument(documentId);
      }
    } catch {}
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
    } catch {}
  };

  const deleteComment = async (commentId: string, documentId: string) => {
    try {
      await fetch('/api/pod-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
      loadDocument(documentId);
    } catch {}
  };

  const openDocEditor = useCallback(async (docId: string) => {
    try {
      const r = await fetch(`/api/pod-documents?documentId=${docId}`);
      const data = await r.json();
      if (data.document) {
        setEditorDoc(data.document);
        setEditorContent(data.document.content || '');
        setEditorDirty(false);
      }
    } catch {}
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
      if (r.ok) { setEditorDirty(false); openDocEditor(editorDoc.id); }
    } catch {}
    setEditorSaving(false);
  };

  useEffect(() => {
    if (!editorDoc) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/pod-documents?documentId=${editorDoc.id}`);
        const data = await r.json();
        if (data.document) {
          setEditorDoc(prev => prev ? { ...prev, comments: data.document.comments } : null);
          if (!editorDirty && data.document.content !== editorContent) {
            setEditorContent(data.document.content || '');
          }
        }
      } catch {}
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
        body: JSON.stringify({ action: 'comment', documentId: editorDoc.id, content: text, parentId: parentId || null }),
      });
      if (r.ok) {
        if (parentId) { setReplyText(''); setReplyingTo(null); }
        else setCommentText('');
        openDocEditor(editorDoc.id);
      }
    } catch {}
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
    } catch {}
  };

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

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedPod) return;
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
    try {
      await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-reaction', podId: selectedPod.id, messageId, emoji }),
      });
      loadMyStats(selectedPod.id);
    } catch {}
  };

  const createPoll = async () => {
    if (!selectedPod || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    try {
      await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-poll', podId: selectedPod.id, question: pollQuestion, options: pollOptions.filter(o => o.trim()) }),
      });
      setShowCreatePoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      loadMessages(selectedPod.id);
      loadPolls(selectedPod.id);
    } catch {}
  };

  const votePoll = async (pollId: string, optionIdx: number) => {
    if (!selectedPod) return;
    try {
      const r = await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote-poll', podId: selectedPod.id, pollId, optionIdx }),
      });
      const data = await r.json();
      if (data.poll) setPodsPolls(prev => prev.map(p => p.id === data.poll.id ? data.poll : p));
      loadMyStats(selectedPod.id);
    } catch {}
  };

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
        body: JSON.stringify({ action: 'comment', documentId: editorDoc.id, content: selectionCommentText, section: selectedText, parentId: null }),
      });
      if (r.ok) {
        setSelectionCommentText('');
        setSelectedText('');
        setShowSelectionComment(false);
        openDocEditor(editorDoc.id);
      }
    } catch {}
  };

  const getDocForMessage = useCallback((msg: PodMessage): PodDoc | undefined => {
    if (msg.type !== 'essay_share' || !msg.essayId) return undefined;
    return documents.find(d => d.id === msg.essayId);
  }, [documents]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const [isDragging, setIsDragging] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
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

  const [mobileShowChat, setMobileShowChat] = useState(false);

  const selectPod = (pod: PodSummary) => {
    setSelectedPod(pod);
    setMobileShowChat(true);
    setActiveTab('chat');
  };

  const mobileBackToList = () => { setMobileShowChat(false); };

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
    return new Date(dateStr).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  type GroupedMessage = PodMessage & { isGroupStart: boolean; isGroupEnd: boolean };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m.content.toLowerCase().includes(q) || m.user.name.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const groupedMessages: GroupedMessage[] = filteredMessages.map((msg, i) => {
    const prev = filteredMessages[i - 1];
    const next = filteredMessages[i + 1];
    const sameUserAsPrev = prev && prev.user.id === msg.user.id &&
      (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 300000;
    const sameUserAsNext = next && next.user.id === msg.user.id &&
      (new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 300000;
    return { ...msg, isGroupStart: !sameUserAsPrev, isGroupEnd: !sameUserAsNext };
  });

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

  if (status !== 'authenticated') return null;

  return (
    <DashboardLayout>
      <Head><title>Study Pods | AdmitsOnly Dashboard</title></Head>

      <div className="h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-8rem)]">
        <div className="flex h-full bg-white rounded-2xl overflow-hidden border border-slate-100">

          <div className={`w-full lg:w-[280px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-white ${mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Study Pods</h2>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{pods.length}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setShowCreate(true); setShowJoin(false); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  New
                </button>
                <button
                  onClick={() => { setShowJoin(true); setShowCreate(false); setError(''); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Join
                </button>
              </div>
            </div>

            {showCreate && (
              <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
                <input
                  type="text"
                  value={newPodName}
                  onChange={e => setNewPodName(e.target.value)}
                  placeholder="Pod name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  autoFocus
                />
                <textarea
                  value={newPodDesc}
                  onChange={e => setNewPodDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={createPod} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-md hover:bg-accent/90 transition-colors">Create</button>
                </div>
              </div>
            )}

            {showJoin && (
              <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  maxLength={8}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-mono tracking-wider text-center uppercase text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowJoin(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors">Cancel</button>
                  <button onClick={joinPod} className="px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-md hover:bg-accent/90 transition-colors">Join</button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : pods.length === 0 ? (
                <div className="p-5 text-center">
                  <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-xs text-slate-400">Create or join a pod to get started</p>
                </div>
              ) : (
                <div className="space-y-px">
                  {pods.map(pod => {
                    const isActive = selectedPod?.id === pod.id;
                    const hasUnread = !isActive && isUnread(pod.lastMessage);
                    return (
                      <button
                        key={pod.id}
                        onClick={() => selectPod(pod)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-accent/5 border-l-2 border-accent'
                            : 'hover:bg-slate-50 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${getAvatarColor(pod.name)} flex items-center justify-center text-[11px] font-bold flex-shrink-0`}>
                            {pod.name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className={`text-[13px] font-medium truncate ${isActive ? 'text-accent' : 'text-slate-700'}`}>{pod.name}</p>
                                {hasUnread && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                              </div>
                              {pod.lastMessage && (
                                <span className="text-[10px] text-slate-400 flex-shrink-0">{formatTime(pod.lastMessage.createdAt)}</span>
                              )}
                            </div>
                            {pod.lastMessage && (
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                {pod.lastMessage.userName}: {pod.lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 flex-shrink-0">
              {myStats && myStats.currentStreak > 0 && (
                <div className="flex items-center gap-2 mb-2 px-0.5">
                  <span className="text-sm">{myStats.currentStreak >= 7 ? '🔥' : '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium text-amber-600">{myStats.currentStreak}d streak</p>
                      <p className="text-[10px] text-slate-400">{myStats.xp} XP</p>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (myStats.currentStreak / 30) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className={`w-7 h-7 rounded-lg ${getAvatarColor(currentUserName)} flex items-center justify-center text-[10px] font-bold`}>
                    {getInitials(currentUserName)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border-[1.5px] border-white rounded-full" />
                </div>
                <p className="text-xs font-medium text-slate-600 truncate flex-1">{currentUserName}</p>
                {myStats && myStats.xp > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium">{myStats.xp} XP</span>
                )}
              </div>
            </div>
          </div>

          {selectedPod ? (
            <div
              className={`relative flex flex-col flex-1 min-w-0 bg-white ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 z-50 bg-accent/5 border-2 border-dashed border-accent rounded-r-2xl flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-8 h-8 text-accent mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-semibold text-accent">Drop to upload</p>
                  </div>
                </div>
              )}

              <div className="px-3 lg:px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button onClick={mobileBackToList} className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{selectedPod.name}</h3>
                    <span className="hidden sm:inline text-[11px] text-slate-400">{members.length} members</span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {activeTab === 'chat' && (
                      <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-1.5 rounded-md transition-colors ${showSearch ? 'text-accent bg-accent/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        title="Search messages"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={copyInviteCode}
                      className="relative hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-mono tracking-wider text-slate-500 hover:text-accent hover:bg-accent/5 rounded-md transition-colors"
                      title="Copy invite code"
                    >
                      {selectedPod.inviteCode}
                      {showInvite && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap">
                          Copied!
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowMembers(!showMembers)}
                      className={`p-1.5 rounded-md transition-colors ${showMembers ? 'text-accent bg-accent/5' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                      title="View members"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m6 5.197V20" />
                      </svg>
                    </button>
                    {leaveConfirm ? (
                      <span className="flex items-center gap-1">
                        <button onClick={() => { leavePod(selectedPod.id); setLeaveConfirm(false); }} className="text-[10px] font-semibold text-red-500 px-2 py-1 rounded-md bg-red-50">Leave</button>
                        <button onClick={() => setLeaveConfirm(false)} className="text-[10px] font-semibold text-slate-400 px-2 py-1 rounded-md bg-slate-100">Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setLeaveConfirm(true)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Leave pod"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {showSearch && activeTab === 'chat' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/30 bg-slate-50"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex gap-0.5 mt-2 -mx-3 lg:-mx-4 px-3 lg:px-4 border-t border-slate-100 pt-2">
                  {([
                    { key: 'chat' as const, label: 'Chat', badge: null },
                    { key: 'documents' as const, label: 'Files', badge: documents.length > 0 ? documents.length : null },
                    { key: 'focus' as const, label: 'Focus', badge: sessions.filter(s => s.status !== 'completed').length > 0 ? sessions.filter(s => s.status !== 'completed').length : null },
                    { key: 'leaderboard' as const, label: 'Board', badge: null },
                  ]).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setActiveTab(tab.key);
                        if (tab.key === 'chat') setSelectedDoc(null);
                        if (tab.key === 'focus') setSelectedSession(null);
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        activeTab === tab.key
                          ? 'text-accent border-b-2 border-accent'
                          : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent'
                      }`}
                    >
                      {tab.label}
                      {tab.badge && (
                        <span className={`text-[9px] px-1 py-px rounded-full font-semibold ${
                          activeTab === tab.key ? 'bg-accent/10 text-accent' : 'bg-slate-100 text-slate-500'
                        }`}>{tab.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === 'documents' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 lg:px-5 pt-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-xl hover:border-accent/40 hover:bg-accent/5 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-accent transition-colors">Upload a document</p>
                          <p className="text-xs text-slate-400">PDF, TXT, DOC, DOCX, images up to 5MB</p>
                        </div>
                      </button>
                      {uploading && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                          <svg className="w-5 h-5 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <p className="text-xs font-medium text-accent">Uploading...</p>
                        </div>
                      )}
                    </div>
                    <div className="px-4 lg:px-5 py-4">
                      {docLoading ? (
                        <div className="text-center py-8 text-sm text-slate-400">Loading documents...</div>
                      ) : documents.length === 0 ? (
                        <div className="text-center py-8">
                          <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-xs text-slate-400">No documents shared yet</p>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          {documents.map(doc => (
                            <button
                              key={doc.id}
                              onClick={() => openDocEditor(doc.id)}
                              className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-accent/20 hover:bg-slate-50 transition-colors group flex items-center gap-3"
                            >
                              <div className={`w-10 h-10 rounded-lg ${getFileColor(doc.fileType)} flex items-center justify-center flex-shrink-0`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(doc.fileType)} />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-accent transition-colors">{doc.fileName}</p>
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

              {activeTab === 'focus' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {selectedSession ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3 flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => setSelectedSession(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{selectedSession.title}</p>
                            <p className="text-[10px] text-slate-400">
                              by {selectedSession.creator.name} &middot; {selectedSession.focusDuration}m focus / {selectedSession.breakDuration}m break &middot; {selectedSession.rounds} rounds
                            </p>
                          </div>
                        </div>
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

                      <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-6">
                        {(selectedSession.status === 'active' || selectedSession.status === 'break') && (
                          <div className="text-center mb-6">
                            <div className={`inline-block p-6 rounded-2xl border-2 ${
                              selectedSession.status === 'active' ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'
                            }`}>
                              <span className="text-5xl font-bold text-slate-800 font-mono tracking-wider">{timerDisplay || '--:--'}</span>
                              <p className={`text-xs font-semibold mt-2 ${
                                selectedSession.status === 'active' ? 'text-emerald-600' : 'text-blue-600'
                              }`}>
                                {selectedSession.status === 'active' ? 'Focus Time' : 'Break Time'}
                              </p>
                            </div>
                            {selectedSession.creatorId === currentUserId && (
                              <div className="mt-4">
                                <button
                                  onClick={() => advanceSession(selectedSession.id)}
                                  className="px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-colors"
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
                            <div className="inline-block p-6 rounded-2xl border-2 border-amber-200 bg-amber-50">
                              <svg className="w-10 h-10 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-xs font-semibold text-amber-600">Waiting to start</p>
                            </div>
                            {selectedSession.creatorId === currentUserId && (
                              <div className="mt-4">
                                <button
                                  onClick={() => startSession(selectedSession.id)}
                                  className="px-5 py-2.5 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                                >
                                  Start Session
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedSession.status === 'completed' && (
                          <div className="text-center mb-6">
                            <div className="inline-block p-6 rounded-2xl border-2 border-slate-200 bg-slate-50">
                              <svg className="w-10 h-10 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-xs font-semibold text-slate-500">Session Complete</p>
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Participants — {selectedSession.participants?.length || 0}
                          </p>
                          <div className="space-y-2">
                            {selectedSession.participants?.map(p => (
                              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-slate-100">
                                <div className={`w-8 h-8 rounded-lg ${getAvatarColor(p.user.name)} flex items-center justify-center text-[10px] font-bold`}>
                                  {getInitials(p.user.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-slate-700">{p.user.name}</p>
                                  {p.goal && <p className="text-[10px] text-slate-400 truncate">{p.goal}</p>}
                                </div>
                                {p.userId === currentUserId && selectedSession.status !== 'completed' && (
                                  <button
                                    onClick={() => toggleGoalComplete(selectedSession.id)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      p.completed ? 'text-emerald-500 bg-emerald-50' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'
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
                                className="w-full px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                              >
                                Join Session
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : showCreateSession ? (
                    <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-5">
                      <div className="max-w-sm mx-auto space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                          <button onClick={() => setShowCreateSession(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <h4 className="text-sm font-bold text-slate-800">New Focus Session</h4>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Title</label>
                          <input type="text" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Focus (min)</label>
                            <input type="number" value={sessionFocusDuration} onChange={e => setSessionFocusDuration(Math.max(1, parseInt(e.target.value) || 1))} min={1}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Break (min)</label>
                            <input type="number" value={sessionBreakDuration} onChange={e => setSessionBreakDuration(Math.max(1, parseInt(e.target.value) || 1))} min={1}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rounds</label>
                            <input type="number" value={sessionRounds} onChange={e => setSessionRounds(Math.max(1, parseInt(e.target.value) || 1))} min={1}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Goal (optional)</label>
                          <input type="text" value={sessionGoal} onChange={e => setSessionGoal(e.target.value)} placeholder="e.g. Finish Common App essay draft"
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
                        </div>
                        <div className="flex gap-3 pt-2">
                          <button onClick={() => setShowCreateSession(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                          <button onClick={createSession} className="flex-1 px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent/90 transition-colors">Create Session</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-4">
                      <button
                        onClick={() => setShowCreateSession(true)}
                        className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 text-slate-500 text-xs font-semibold rounded-xl hover:border-accent/30 hover:text-accent hover:bg-accent/5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        New Focus Session
                      </button>
                      {sessions.length === 0 ? (
                        <div className="text-center py-12">
                          <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs text-slate-400">No focus sessions yet</p>
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
                                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                                  isActive ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300' :
                                  s.status === 'waiting' ? 'border-amber-200 bg-amber-50/30 hover:border-amber-300' :
                                  'border-slate-100 bg-white hover:border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-slate-700 truncate">{s.title}</p>
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
                                  <span className="text-[10px] text-slate-400">{s.focusDuration}m/{s.breakDuration}m x{s.rounds}</span>
                                  <span className="text-[10px] text-slate-400">{participantCount} {participantCount === 1 ? 'person' : 'people'}</span>
                                  <span className="text-[10px] text-slate-400 ml-auto">{formatTime(s.createdAt)}</span>
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

              {activeTab === 'leaderboard' && (
                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 lg:px-5 py-4 space-y-5">
                    {myStats && (
                      <div className="bg-white rounded-2xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-slate-800">Your Stats</h4>
                          {myStats.currentStreak > 0 && (
                            <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                              {myStats.currentStreak >= 7 ? '🔥' : '⚡'} {myStats.currentStreak}-day streak
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-center">
                          <div>
                            <p className="text-xl font-bold text-accent">{myStats.xp}</p>
                            <p className="text-[10px] text-slate-400">XP</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-700">{myStats.messagesCount}</p>
                            <p className="text-[10px] text-slate-400">Messages</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-700">{myStats.sessionsCount}</p>
                            <p className="text-[10px] text-slate-400">Sessions</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-slate-700">{myStats.longestStreak}</p>
                            <p className="text-[10px] text-slate-400">Best Streak</p>
                          </div>
                        </div>
                        {(() => {
                          const unlocked: string[] = JSON.parse(myStats.achievements || '[]');
                          return unlocked.length > 0 ? (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Achievements</p>
                              <div className="flex flex-wrap gap-2">
                                {achievementDefs.filter(a => unlocked.includes(a.id)).map(a => (
                                  <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100" title={a.desc}>
                                    <span className="text-sm">{a.icon}</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{a.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-3">Pod Rankings</h4>
                      <div className="space-y-1.5">
                        {leaderboard.map((entry, i) => {
                          const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                          const isMe = entry.userId === currentUserId;
                          return (
                            <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-accent/5 border border-accent/10' : 'bg-white border border-slate-100'}`}>
                              <div className="w-7 text-center">
                                {rankIcon ? <span className="text-base">{rankIcon}</span> : <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                              </div>
                              <div className={`w-8 h-8 rounded-lg ${getAvatarColor(entry.user?.name || '')} flex items-center justify-center text-xs font-bold`}>
                                {getInitials(entry.user?.name || '?')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${isMe ? 'text-accent' : 'text-slate-700'}`}>
                                  {entry.user?.name || 'Unknown'} {isMe && <span className="text-[10px] text-accent/60">(you)</span>}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {entry.currentStreak > 0 && (
                                    <span className="text-[10px] text-amber-600 font-semibold">{entry.currentStreak >= 7 ? '🔥' : '⚡'} {entry.currentStreak}d</span>
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
                            <p className="text-xs text-slate-400">Send messages and complete sessions to earn XP</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {podActivities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Recent Activity</h4>
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
                                <div className={`w-6 h-6 rounded-md ${getAvatarColor(a.user.name)} flex items-center justify-center text-[8px] font-bold mt-0.5`}>
                                  {getInitials(a.user.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-700">{a.user.name}</span>{' '}
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

                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-3">All Achievements</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {achievementDefs.map(a => {
                          const unlocked = myStats ? JSON.parse(myStats.achievements || '[]').includes(a.id) : false;
                          return (
                            <div key={a.id} className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors ${unlocked ? 'bg-white border-accent/20' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                              <span className="text-xl">{a.icon}</span>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold ${unlocked ? 'text-slate-700' : 'text-slate-400'}`}>{a.label}</p>
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

              {activeTab === 'chat' && <>
                {showMembers && (
                  <div className="px-3 lg:px-4 py-2 border-b border-slate-200 bg-white flex-shrink-0">
                    <div className="flex flex-wrap gap-1.5">
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                          <div className={`w-5 h-5 rounded ${getAvatarColor(m.user.name)} flex items-center justify-center text-[8px] font-bold`}>
                            {getInitials(m.user.name)}
                          </div>
                          <span className="text-[11px] text-slate-600">{m.user.name}</span>
                          {m.role === 'admin' && <span className="text-[8px] px-1 py-px rounded bg-accent/10 text-accent font-semibold">Admin</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-3 lg:px-5 py-3" style={{ overscrollBehavior: 'contain' }}>
                  {filteredMessages.length === 0 && !searchQuery ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-xs text-slate-400">Start the conversation</p>
                      </div>
                    </div>
                  ) : filteredMessages.length === 0 && searchQuery ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-xs text-slate-400">No messages match your search</p>
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
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-[10px] font-medium text-slate-400 px-2">{getDateLabel(msg.createdAt)}</span>
                                <div className="flex-1 h-px bg-slate-200" />
                              </div>
                            )}

                            <div
                              className={`relative flex gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors group ${msg.isGroupStart ? 'mt-3' : 'mt-px'}`}
                              onMouseEnter={() => setHoveredMessage(msg.id)}
                              onMouseLeave={() => { setHoveredMessage(null); if (showReactionPicker === msg.id) setShowReactionPicker(null); }}
                            >
                              {hoveredMessage === msg.id && (
                                <div className="absolute -top-3 right-3 flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-0.5 z-10">
                                  <button
                                    onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                                    title="Add reaction"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                  <button
                                    className="p-1.5 rounded-md text-slate-400 hover:text-accent hover:bg-accent/5 transition-colors"
                                    title="Reply"
                                    onClick={() => { setReplyToMsg(msg); textareaRef.current?.focus(); }}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                </div>
                              )}

                              {showReactionPicker === msg.id && (
                                <div className="absolute -top-12 right-3 flex items-center gap-1 bg-white border border-slate-200 rounded-xl shadow-sm px-2 py-1.5 z-20">
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

                              <div className="w-8 flex-shrink-0">
                                {msg.isGroupStart ? (
                                  <div className={`w-8 h-8 rounded-lg ${getAvatarColor(msg.user.name)} flex items-center justify-center text-[10px] font-bold`}>
                                    {getInitials(msg.user.name)}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity leading-[20px] block text-center">
                                    {formatTimeFull(msg.createdAt)}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {msg.isGroupStart && (
                                  <div className="flex items-baseline gap-2 mb-px">
                                    <span className={`text-[13px] font-semibold ${isMe ? 'text-accent' : 'text-slate-800'}`}>
                                      {isMe ? 'You' : msg.user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{formatTimeFull(msg.createdAt)}</span>
                                  </div>
                                )}
                                <div className="text-[13px] text-slate-600 leading-relaxed break-words">
                                  {(() => {
                                    const linkedDoc = getDocForMessage(msg);
                                    if (linkedDoc) {
                                      return (
                                        <button
                                          onClick={() => openDocEditor(linkedDoc.id)}
                                          className="w-full max-w-md mt-1 flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-accent/30 transition-colors text-left group/card"
                                        >
                                          <div className={`w-10 h-10 rounded-lg ${getFileColor(linkedDoc.fileType)} flex items-center justify-center flex-shrink-0`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(linkedDoc.fileType)} />
                                            </svg>
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-700 truncate group-hover/card:text-accent transition-colors">{linkedDoc.fileName}</p>
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
                                          <div className="flex-shrink-0 px-3 py-1.5 bg-accent/5 text-accent text-[11px] font-bold rounded-lg group-hover/card:bg-accent group-hover/card:text-white transition-colors">
                                            Open
                                          </div>
                                        </button>
                                      );
                                    }
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
                                    if (msg.type === 'poll' && msg.essayId) {
                                      const poll = pods_polls.find(p => p.id === msg.essayId);
                                      if (poll) {
                                        const options: string[] = JSON.parse(poll.options || '[]');
                                        const totalVotes = poll.votes.length;
                                        const myVote = poll.votes.find(v => v.userId === currentUserId);
                                        return (
                                          <div className="w-full max-w-md mt-1 p-3.5 bg-white border border-slate-200 rounded-xl">
                                            <p className="text-sm font-bold text-slate-800 mb-2.5">{poll.question}</p>
                                            <div className="space-y-1.5">
                                              {options.map((opt, idx) => {
                                                const voteCount = poll.votes.filter(v => v.optionIdx === idx).length;
                                                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                                const isMyVote = myVote?.optionIdx === idx;
                                                return (
                                                  <button
                                                    key={idx}
                                                    onClick={() => votePoll(poll.id, idx)}
                                                    className={`w-full relative overflow-hidden rounded-lg border p-2 text-left transition-colors ${
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

                                {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {Object.entries(messageReactions[msg.id]).map(([emoji, userIds]) => {
                                      const uids = userIds as string[];
                                      return (
                                        <button
                                          key={emoji}
                                          onClick={() => toggleReaction(msg.id, emoji)}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
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
                      {typingVisible && (
                        <div className="px-2 py-1 mt-1">
                          <span className="text-[11px] text-slate-400 italic">typing...</span>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="px-3 lg:px-4 pb-3 lg:pb-4 pt-1.5 flex-shrink-0 bg-white border-t border-slate-200">
                  <input ref={fileInputRef} type="file" onChange={handleFileUpload} accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif" className="hidden" />
                  {uploading && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-accent/5 border border-accent/15 rounded-lg text-[11px] text-accent font-medium">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading...
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-600">
                      {error}
                      <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                  {replyToMsg && (
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-1 bg-accent/5 border-l-2 border-accent rounded-r-lg text-[11px]">
                      <span className="text-accent font-medium">Replying to {replyToMsg.user.name}</span>
                      <span className="text-slate-400 truncate flex-1">{replyToMsg.content}</span>
                      <button onClick={() => setReplyToMsg(null)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  )}
                  {showCreatePoll && (
                    <div className="px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg mb-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">Create a Poll</p>
                        <button onClick={() => setShowCreatePoll(false)} className="text-slate-400 hover:text-slate-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Ask a question..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30" autoFocus />
                      {pollOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                          <input type="text" value={opt}
                            onChange={e => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }}
                            placeholder={`Option ${i + 1}`}
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30" />
                          {pollOptions.length > 2 && (
                            <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        {pollOptions.length < 6 && (
                          <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-accent hover:text-accent/80 font-semibold">+ Add option</button>
                        )}
                        <button onClick={createPoll} disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed ml-auto">
                          Create Poll
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-end gap-1.5 bg-white rounded-xl border border-slate-200 px-2 py-1.5 focus-within:border-slate-300 transition-colors">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0 disabled:opacity-40" title="Share a document">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <button onClick={() => setShowCreatePoll(!showCreatePoll)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0" title="Create a poll">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      onInput={e => {
                        const el = e.currentTarget;
                        el.style.height = 'auto';
                        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                      }}
                      rows={1}
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                      placeholder={replyToMsg ? `Reply to ${replyToMsg.user.name}...` : 'Type a message...'}
                      className="flex-1 py-1.5 text-[13px] bg-transparent focus:outline-none placeholder-slate-400 resize-none leading-relaxed"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim() || sending}
                      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                        messageText.trim() ? 'text-white bg-accent hover:bg-accent/90' : 'text-slate-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>}

              {editorDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={closeDocEditor}>
                  <div className="absolute inset-0 bg-slate-900/50" />
                  <div className="relative w-[95vw] h-[90vh] max-w-7xl bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 flex-shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg ${getFileColor(editorDoc.fileType)} flex items-center justify-center flex-shrink-0`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(editorDoc.fileType)} />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-800 truncate">{editorDoc.fileName}</p>
                          <p className="text-xs text-slate-400">
                            Shared by {editorDoc.uploader.name} &middot; {formatFileSize(editorDoc.fileSize)}
                            {editorDirty && <span className="ml-2 text-amber-500 font-semibold">Unsaved changes</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(editorDoc.fileType === 'pdf' || editorDoc.fileType === 'image') && (
                          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <button onClick={() => setDocZoom(z => Math.max(50, z - 25))} className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-white transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                            </button>
                            <span className="text-[11px] font-semibold text-slate-600 min-w-[3rem] text-center">{docZoom}%</span>
                            <button onClick={() => setDocZoom(z => Math.min(200, z + 25))} className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-white transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <button onClick={() => setDocZoom(100)} className="px-2 py-1.5 rounded-md text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-white transition-colors">Reset</button>
                          </div>
                        )}
                        {(editorDoc.fileType === 'txt' || editorDoc.content) && editorDirty && (
                          <button onClick={saveDocContent} disabled={editorSaving}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors">
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
                          <a href={editorDoc.fileData} download={editorDoc.fileName} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" title="Download">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </a>
                        )}
                        {editorDoc.uploaderId === currentUserId && (
                          <button onClick={() => { deleteDocument(editorDoc.id); closeDocEditor(); }}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete document">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        <button onClick={closeDocEditor} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1" title="Close (Esc)">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {(editorDoc.fileType === 'txt' || editorDoc.content) && (
                      <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-slate-500">Select any text in the document to leave a comment on that specific section</span>
                      </div>
                    )}

                    <div className="flex-1 flex overflow-hidden">
                      <div className="flex-1 overflow-y-auto border-r border-slate-200 bg-white" ref={textContentRef}>
                        {editorDoc.fileType === 'txt' || (editorDoc.content && !editorDoc.fileData) ? (
                          <div className="p-6 lg:p-8 max-w-4xl mx-auto">
                            {(() => {
                              const sectionComments = editorDoc.comments?.filter(c => c.section) || [];
                              const hasAnnotations = sectionComments.length > 0;

                              if (hasAnnotations && editorContent) {
                                const annotationColors = ['bg-amber-100 border-amber-300', 'bg-blue-100 border-blue-300', 'bg-green-100 border-green-300', 'bg-pink-100 border-pink-300', 'bg-purple-100 border-purple-300'];
                                const highlights: { text: string; color: string; commentUser: string; commentContent: string }[] = [];

                                sectionComments.forEach((c, i) => {
                                  if (editorContent.includes(c.section)) {
                                    highlights.push({ text: c.section, color: annotationColors[i % annotationColors.length], commentUser: c.user.name, commentContent: c.content });
                                  }
                                });

                                let html = editorContent;
                                highlights.forEach(h => {
                                  const escapedText = h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  html = html.replace(
                                    new RegExp(escapedText, 'g'),
                                    `<mark class="${h.color} border-b-2 px-0.5 rounded-sm cursor-pointer" title="${h.commentUser}: ${h.commentContent.replace(/"/g, '&quot;')}">${h.text}</mark>`
                                  );
                                });

                                return (
                                  <>
                                    <div className="w-full min-h-[500px] p-6 text-base text-slate-800 leading-[1.8] bg-white border border-slate-200 rounded-xl whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{ __html: html }} onMouseUp={handleTextSelection} />
                                    <div className="mt-2">
                                      <button
                                        onClick={() => {
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
                                    <textarea id="doc-editor-textarea" value={editorContent}
                                      onChange={e => { setEditorContent(e.target.value); setEditorDirty(true); }}
                                      onMouseUp={handleTextSelection}
                                      className="w-full min-h-[500px] p-6 text-base text-slate-800 leading-[1.8] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 resize-y mt-2 hidden"
                                      placeholder="Start writing or paste your content here..." />
                                  </>
                                );
                              }

                              return (
                                <textarea value={editorContent}
                                  onChange={e => { setEditorContent(e.target.value); setEditorDirty(true); }}
                                  onMouseUp={handleTextSelection}
                                  className="w-full min-h-[500px] p-6 text-base text-slate-800 leading-[1.8] bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 resize-y"
                                  placeholder="Start writing or paste your content here..." />
                              );
                            })()}

                            {showSelectionComment && selectedText && (
                              <div className="mt-4 p-4 bg-white border-2 border-indigo-200 rounded-xl shadow-sm">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-indigo-700 mb-1.5">Comment on selection:</p>
                                    <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg mb-3">
                                      <p className="text-xs text-indigo-600 italic line-clamp-2">&ldquo;{selectedText}&rdquo;</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <input type="text" value={selectionCommentText}
                                        onChange={e => setSelectionCommentText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitSelectionComment(); }}
                                        placeholder="Your feedback on this section..."
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                        autoFocus />
                                      <button onClick={submitSelectionComment} disabled={!selectionCommentText.trim()}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors">Post</button>
                                      <button onClick={() => { setShowSelectionComment(false); setSelectedText(''); setSelectionCommentText(''); }}
                                        className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : editorDoc.fileType === 'image' && editorDoc.fileData ? (
                          <div className="p-6 flex justify-center items-center min-h-full">
                            <img src={editorDoc.fileData} alt={editorDoc.fileName}
                              className="rounded-xl transition-transform duration-200"
                              style={{ transform: `scale(${docZoom / 100})`, transformOrigin: 'center center', maxWidth: '100%', maxHeight: '70vh' }} />
                          </div>
                        ) : editorDoc.fileType === 'pdf' && editorDoc.fileData ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50 p-4">
                            <iframe src={`${editorDoc.fileData}#zoom=${docZoom}&view=FitH`}
                              className="w-full h-full border-0 rounded-lg bg-white" title={editorDoc.fileName} style={{ minHeight: '100%' }} />
                          </div>
                        ) : (
                          <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                            <div className={`w-16 h-16 mx-auto rounded-2xl ${getFileColor(editorDoc.fileType)} flex items-center justify-center mb-4`}>
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(editorDoc.fileType)} />
                              </svg>
                            </div>
                            <p className="text-lg font-bold text-slate-800 mb-2">{editorDoc.fileName}</p>
                            <p className="text-sm text-slate-400 mb-6">This file type can be downloaded to view</p>
                            {editorDoc.fileData && (
                              <a href={editorDoc.fileData} download={editorDoc.fileName}
                                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-accent rounded-xl hover:bg-accent/90 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download File
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="w-80 lg:w-[26rem] flex flex-col bg-white overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-slate-200">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            Feedback
                            {editorDoc.comments && editorDoc.comments.length > 0 && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold">{editorDoc.comments.length}</span>
                            )}
                          </h4>
                        </div>

                        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50">
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-lg ${getAvatarColor(currentUserName)} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>
                              {getInitials(currentUserName)}
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addEditorComment(); }}
                                placeholder="Leave feedback on this document..."
                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white" />
                              {commentText.trim() && (
                                <div className="flex justify-end">
                                  <button onClick={() => addEditorComment()}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors">Post Comment</button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                          {editorDoc.comments && editorDoc.comments.length > 0 ? (
                            editorDoc.comments.map(comment => (
                              <div key={comment.id} className="group bg-slate-50 rounded-xl p-3.5 hover:bg-slate-100 transition-colors">
                                <div className="flex gap-3">
                                  <div className={`w-7 h-7 rounded-lg ${getAvatarColor(comment.user.name)} flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5`}>
                                    {getInitials(comment.user.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-slate-700">{comment.user.name}</span>
                                      <span className="text-[10px] text-slate-400">{formatTime(comment.createdAt)}</span>
                                      {comment.userId === currentUserId && (
                                        <button onClick={() => deleteEditorComment(comment.id)}
                                          className="ml-auto text-[10px] text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">Delete</button>
                                      )}
                                    </div>

                                    {comment.section && (
                                      <div className="mb-2 px-3 py-1.5 bg-indigo-50 border-l-2 border-indigo-300 rounded-r-md">
                                        <p className="text-[11px] text-indigo-600 italic line-clamp-2">&ldquo;{comment.section}&rdquo;</p>
                                      </div>
                                    )}

                                    <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>

                                    <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                      className="mt-2 text-[11px] text-slate-400 hover:text-accent font-semibold transition-colors">Reply</button>

                                    {replyingTo === comment.id && (
                                      <div className="flex gap-2 mt-2.5">
                                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') addEditorComment(comment.id); }}
                                          placeholder="Write a reply..." autoFocus
                                          className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/20 bg-white" />
                                        <button onClick={() => addEditorComment(comment.id)} disabled={!replyText.trim()}
                                          className="px-3 py-1.5 text-[11px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 transition-colors">Reply</button>
                                      </div>
                                    )}

                                    {comment.replies && comment.replies.length > 0 && (
                                      <div className="mt-3 ml-1 pl-3 border-l-2 border-accent/20 space-y-2.5">
                                        {comment.replies.map(reply => (
                                          <div key={reply.id} className="group/reply flex gap-2">
                                            <div className={`w-6 h-6 rounded-md ${getAvatarColor(reply.user.name)} flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5`}>
                                              {getInitials(reply.user.name)}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-[11px] font-bold text-slate-700">{reply.user.name}</span>
                                                <span className="text-[9px] text-slate-400">{formatTime(reply.createdAt)}</span>
                                                {reply.userId === currentUserId && (
                                                  <button onClick={() => deleteEditorComment(reply.id)}
                                                    className="text-[9px] text-slate-300 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-all">Delete</button>
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
                              <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                              <p className="text-xs text-slate-400">No feedback yet</p>
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
            <div className="hidden lg:flex items-center justify-center flex-1 bg-white">
              <div className="text-center">
                <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-slate-400">Select a pod to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
