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

  // Document Collaboration Hub
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'focus'>('chat');
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
            <div className={`relative flex flex-col h-full bg-white ${mobileShowChat ? 'flex' : 'hidden lg:flex'}`}>
              {/* ─── Chat header ─── */}
              <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-white">
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

                {/* ─── Tab switcher: Chat | Documents ─── */}
                <div className="flex gap-1 mt-3 bg-slate-100/60 rounded-lg p-0.5">
                  <button
                    onClick={() => { setActiveTab('chat'); setSelectedDoc(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'chat'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'documents'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Files
                    {documents.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">{documents.length}</span>
                    )}
                  </button>
                  <button
                    onClick={() => { setActiveTab('focus'); setSelectedSession(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      activeTab === 'focus'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Focus
                    {sessions.filter(s => s.status !== 'completed').length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                        {sessions.filter(s => s.status !== 'completed').length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* ═══════════════ DOCUMENTS TAB (History view) ═══════════════ */}
              {activeTab === 'documents' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    {/* Info banner */}
                    <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-accent/5">
                      <div className="flex items-center gap-2 text-xs text-accent">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Upload documents using the <strong>📎 button in chat</strong>. Click any document below to open, edit, and comment.</span>
                      </div>
                    </div>

                    {/* Document list */}
                    <div className="px-4 lg:px-5 py-4">
                      {docLoading ? (
                        <div className="text-center py-8 text-sm text-slate-400 animate-pulse">Loading documents...</div>
                      ) : documents.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-bold text-primary mb-1">No Documents Yet</h4>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            Share documents using the 📎 button in the chat tab. They will appear here for easy access.
                          </p>
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
                                {(() => {
                                  const linkedDoc = getDocForMessage(msg);
                                  if (linkedDoc) {
                                    return (
                                      <button
                                        onClick={() => openDocEditor(linkedDoc.id)}
                                        className="w-full max-w-sm mt-1 flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-accent/30 hover:shadow-md transition-all text-left group/card"
                                      >
                                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getFileColor(linkedDoc.fileType)} flex items-center justify-center flex-shrink-0`}>
                                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(linkedDoc.fileType)} />
                                          </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-primary truncate group-hover/card:text-accent transition-colors">{linkedDoc.fileName}</p>
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
                                        <div className="flex-shrink-0 text-[10px] text-slate-400 group-hover/card:text-accent font-semibold transition-colors">
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
                                  return msg.content;
                                })()}
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
                {/* Hidden file input for chat uploads */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  className="hidden"
                />
                {uploading && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-accent/5 border border-accent/20 rounded-lg text-xs text-accent font-medium">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Uploading file...
                  </div>
                )}
                <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-all shadow-sm">
                  {/* Attachment button — triggers file upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent/5 transition-colors flex-shrink-0 disabled:opacity-40"
                    title="Upload a document"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
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
                <p className="text-[10px] text-slate-300 mt-1.5 px-1">Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[9px] font-mono">Enter</kbd> to send &middot; Click <span className="text-slate-400">📎</span> to share a document</p>
              </div>
              </>}

              {/* ═══════════════ DOCUMENT EDITOR OVERLAY ═══════════════ */}
              {editorDoc && (
                <div className="absolute inset-0 z-50 flex flex-col bg-white">
                  {/* Editor header */}
                  <div className="px-4 lg:px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3 flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={closeDocEditor}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-all flex-shrink-0"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getFileColor(editorDoc.fileType)} flex items-center justify-center flex-shrink-0`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(editorDoc.fileType)} />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary truncate">{editorDoc.fileName}</p>
                        <p className="text-[10px] text-slate-400">
                          {editorDoc.uploader.name} &middot; {formatFileSize(editorDoc.fileSize)}
                          {editorDirty && <span className="ml-2 text-amber-500 font-semibold">Unsaved changes</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Live indicator */}
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-emerald-700">Live</span>
                      </div>
                      {(editorDoc.fileType === 'txt' || editorDoc.content) && editorDirty && (
                        <button
                          onClick={saveDocContent}
                          disabled={editorSaving}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 transition-all"
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Delete document"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Editor body — split view: content + comments */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left: Document content/editor */}
                    <div className="flex-1 overflow-y-auto border-r border-slate-100">
                      {editorDoc.fileType === 'txt' || (editorDoc.content && !editorDoc.fileData) ? (
                        /* Editable text content */
                        <div className="p-4 lg:p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="text-xs font-semibold text-accent">Collaborative editing — changes are visible to all pod members</span>
                          </div>
                          <textarea
                            value={editorContent}
                            onChange={e => { setEditorContent(e.target.value); setEditorDirty(true); }}
                            className="w-full min-h-[400px] p-4 text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent resize-y font-sans"
                            placeholder="Start writing or paste your content here..."
                          />
                        </div>
                      ) : editorDoc.fileType === 'image' && editorDoc.fileData ? (
                        <div className="p-6 flex justify-center items-start">
                          <img src={editorDoc.fileData} alt={editorDoc.fileName} className="max-w-full max-h-[600px] rounded-xl shadow-sm" />
                        </div>
                      ) : editorDoc.fileType === 'pdf' && editorDoc.fileData ? (
                        <iframe src={editorDoc.fileData} className="w-full h-full border-0" title={editorDoc.fileName} />
                      ) : (
                        <div className="p-8 text-center">
                          <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${getFileColor(editorDoc.fileType)} flex items-center justify-center mb-4`}>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getFileIcon(editorDoc.fileType)} />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-slate-600 mb-1">{editorDoc.fileName}</p>
                          <p className="text-xs text-slate-400 mb-4">This file type can be downloaded to view</p>
                          {editorDoc.fileData && (
                            <a
                              href={editorDoc.fileData}
                              download={editorDoc.fileName}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Comments panel */}
                    <div className="w-80 lg:w-96 flex flex-col bg-slate-50/30 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 bg-white">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          Comments
                          {editorDoc.comments && editorDoc.comments.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-bold">
                              {editorDoc.comments.length}
                            </span>
                          )}
                          <span className="ml-auto flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] text-emerald-600 font-medium">Auto-refreshing</span>
                          </span>
                        </h4>
                      </div>

                      {/* Comment input */}
                      <div className="px-4 py-3 border-b border-slate-100 bg-white">
                        <div className="flex gap-2">
                          <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${getAvatarColor(currentUserName)} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
                            {getInitials(currentUserName)}
                          </div>
                          <div className="flex-1 flex gap-1.5">
                            <input
                              type="text"
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addEditorComment(); }}
                              placeholder="Add feedback..."
                              className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                            />
                            <button
                              onClick={() => addEditorComment()}
                              disabled={!commentText.trim()}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-white bg-accent rounded-lg hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Comments list */}
                      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {editorDoc.comments && editorDoc.comments.length > 0 ? (
                          editorDoc.comments.map(comment => (
                            <div key={comment.id} className="group">
                              <div className="flex gap-2">
                                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getAvatarColor(comment.user.name)} flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0 mt-0.5`}>
                                  {getInitials(comment.user.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="text-[11px] font-bold text-primary">{comment.user.name}</span>
                                    <span className="text-[9px] text-slate-300">{formatTime(comment.createdAt)}</span>
                                    {comment.userId === currentUserId && (
                                      <button
                                        onClick={() => deleteEditorComment(comment.id)}
                                        className="text-[9px] text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed">{comment.content}</p>

                                  {/* Reply button */}
                                  <button
                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                    className="mt-1 text-[10px] text-slate-400 hover:text-accent font-medium transition-colors"
                                  >
                                    Reply
                                  </button>

                                  {/* Reply input */}
                                  {replyingTo === comment.id && (
                                    <div className="flex gap-1.5 mt-2">
                                      <input
                                        type="text"
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') addEditorComment(comment.id); }}
                                        placeholder="Reply..."
                                        className="flex-1 px-2 py-1 text-[11px] rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/30"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => addEditorComment(comment.id)}
                                        disabled={!replyText.trim()}
                                        className="px-2 py-1 text-[10px] font-semibold text-white bg-accent rounded-md hover:bg-accent/90 disabled:opacity-40 transition-colors"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  )}

                                  {/* Threaded replies */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <div className="mt-2 ml-1 pl-2.5 border-l-2 border-slate-100 space-y-2">
                                      {comment.replies.map(reply => (
                                        <div key={reply.id} className="group/reply flex gap-1.5">
                                          <div className={`w-5 h-5 rounded bg-gradient-to-br ${getAvatarColor(reply.user.name)} flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0 mt-0.5`}>
                                            {getInitials(reply.user.name)}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-baseline gap-1.5">
                                              <span className="text-[10px] font-bold text-primary">{reply.user.name}</span>
                                              <span className="text-[8px] text-slate-300">{formatTime(reply.createdAt)}</span>
                                              {reply.userId === currentUserId && (
                                                <button
                                                  onClick={() => deleteEditorComment(reply.id)}
                                                  className="text-[8px] text-slate-300 hover:text-red-500 opacity-0 group-hover/reply:opacity-100 transition-all"
                                                >
                                                  Delete
                                                </button>
                                              )}
                                            </div>
                                            <p className="text-[11px] text-slate-600 leading-relaxed">{reply.content}</p>
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
                          <div className="text-center py-8">
                            <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                              </svg>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">No comments yet</p>
                            <p className="text-[10px] text-slate-400 mt-1">Be the first to give feedback on this document</p>
                          </div>
                        )}
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
