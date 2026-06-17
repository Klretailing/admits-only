import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
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
  user: { id: string; name: string }; pending?: boolean;
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

type ReactionMap = Record<string, Record<string, string[]>>;
type TabKey = 'chat' | 'documents' | 'focus' | 'leaderboard';

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
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
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
    case 'pdf':
      return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
    case 'image':
      return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
    default:
      return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
  }
}

const QUICK_REACTIONS = ['👍', '❤️', '🔥', '👏', '💯', '😂', '🎯', '✨'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function isUnread(lastMessage: PodSummary['lastMessage']): boolean {
  if (!lastMessage) return false;
  return Date.now() - new Date(lastMessage.createdAt).getTime() < 300000;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function fileTypeFromName(name: string, mime: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/')) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'txt';
  if (ext === 'doc') return 'doc';
  if (ext === 'docx') return 'docx';
  return ext || 'file';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseAchievements(raw: string): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function statValue(stats: MemberStats | null, key: string): number {
  if (!stats) return 0;
  const v = (stats as unknown as Record<string, number>)[key];
  return typeof v === 'number' ? v : 0;
}

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar = memo(function Avatar({ name, size = 'md' }: AvatarProps) {
  const sizeClass =
    size === 'sm' ? 'w-7 h-7 text-[11px]' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div
      className={`${sizeClass} ${getAvatarColor(name)} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
});

interface PodListItemProps {
  pod: PodSummary;
  selected: boolean;
  onSelect: (pod: PodSummary) => void;
}

const PodListItem = memo(function PodListItem({ pod, selected, onSelect }: PodListItemProps) {
  const unread = !selected && isUnread(pod.lastMessage);
  return (
    <button
      onClick={() => onSelect(pod)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
        selected ? 'bg-accent/8' : 'hover:bg-slate-50'
      }`}
    >
      <Avatar name={pod.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold truncate ${selected ? 'text-accent' : 'text-primary'}`}>
            {pod.name}
          </span>
          {pod.lastMessage && (
            <span className="text-[10px] text-slate-400 flex-shrink-0">
              {formatRelative(pod.lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {pod.lastMessage ? (
            <span className="text-xs text-slate-400 truncate">
              <span className="text-slate-500">{pod.lastMessage.userName.split(' ')[0]}:</span>{' '}
              {pod.lastMessage.content}
            </span>
          ) : (
            <span className="text-xs text-slate-400 truncate">{pod.memberCount} members</span>
          )}
        </div>
      </div>
      {unread && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
    </button>
  );
});

interface MessageRowProps {
  message: PodMessage;
  grouped: boolean;
  isMine: boolean;
  parent: PodMessage | null;
  reactions: Record<string, string[]> | undefined;
  currentUserId: string;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onReply: (message: PodMessage) => void;
  onOpenPicker: (messageId: string) => void;
  pickerOpen: boolean;
  onClosePicker: () => void;
}

const MessageRow = memo(function MessageRow({
  message,
  grouped,
  isMine,
  parent,
  reactions,
  currentUserId,
  onToggleReaction,
  onReply,
  onOpenPicker,
  pickerOpen,
  onClosePicker,
}: MessageRowProps) {
  const reactionEntries = reactions ? Object.entries(reactions).filter(([, users]) => users.length > 0) : [];
  return (
    <div
      className={`group relative flex gap-3 px-4 ${grouped ? 'mt-0.5' : 'mt-3'} ${
        message.pending ? 'opacity-50' : ''
      }`}
    >
      <div className="w-9 flex-shrink-0">
        {!grouped ? (
          <Avatar name={message.user.name} />
        ) : (
          <span className="block text-[10px] text-slate-300 text-right opacity-0 group-hover:opacity-100 pt-1">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-primary">
              {isMine ? 'You' : message.user.name}
            </span>
            <span className="text-[11px] text-slate-400">{formatTime(message.createdAt)}</span>
          </div>
        )}
        {parent && (
          <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a4 4 0 014 4v0M3 10l4-4M3 10l4 4" />
            </svg>
            <span className="font-medium text-slate-500">{parent.user.name}</span>
            <span className="truncate max-w-[200px]">{parent.content}</span>
          </div>
        )}
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reactionEntries.map(([emoji, users]) => {
              const reacted = users.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    reacted
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute right-4 -top-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-0.5">
          <button
            onClick={() => onOpenPicker(message.id)}
            className="p-1.5 rounded-md text-slate-400 hover:text-accent hover:bg-slate-50"
            title="React"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => onReply(message)}
            className="p-1.5 rounded-md text-slate-400 hover:text-accent hover:bg-slate-50"
            title="Reply in thread"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a4 4 0 014 4v0M3 10l4-4M3 10l4 4" />
            </svg>
          </button>
        </div>
        {pickerOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={onClosePicker} />
            <div className="absolute right-0 mt-1 z-20 flex gap-0.5 bg-white border border-slate-200 rounded-xl shadow-sm px-1.5 py-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction(message.id, emoji);
                    onClosePicker();
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-base flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default function StudyPods() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const currentUserId = (session?.user as { id?: string } | undefined)?.id || '';
  const currentUserName = session?.user?.name || 'You';

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  const [pods, setPods] = useState<PodSummary[]>([]);
  const [selectedPod, setSelectedPod] = useState<PodSummary | null>(null);
  const [messages, setMessages] = useState<PodMessage[]>([]);
  const [members, setMembers] = useState<PodMember[]>([]);
  const [reactions, setReactions] = useState<ReactionMap>({});
  const [polls, setPolls] = useState<PodPoll[]>([]);
  const [documents, setDocuments] = useState<PodDoc[]>([]);
  const [myStats, setMyStats] = useState<MemberStats | null>(null);
  const [achievementDefs, setAchievementDefs] = useState<AchievementDef[]>([]);

  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [newPodName, setNewPodName] = useState('');
  const [newPodDesc, setNewPodDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [replyToMsg, setReplyToMsg] = useState<PodMessage | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [showTyping, setShowTyping] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docModalId, setDocModalId] = useState<string | null>(null);
  const [docModal, setDocModal] = useState<PodDoc | null>(null);
  const [docModalLoading, setDocModalLoading] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [docDirty, setDocDirty] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [docZoom, setDocZoom] = useState(100);
  const [docComment, setDocComment] = useState('');
  const [docReplyTo, setDocReplyTo] = useState<string | null>(null);
  const [docReplyText, setDocReplyText] = useState('');
  const [selectionText, setSelectionText] = useState('');
  const [selectionComment, setSelectionComment] = useState('');
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('Focus Session');
  const [sessionFocus, setSessionFocus] = useState(25);
  const [sessionBreak, setSessionBreak] = useState(5);
  const [sessionRounds, setSessionRounds] = useState(4);
  const [sessionGoal, setSessionGoal] = useState('');
  const [joinGoal, setJoinGoal] = useState('');
  const [timerDisplay, setTimerDisplay] = useState('');

  const [leaderboard, setLeaderboard] = useState<MemberStats[]>([]);
  const [activities, setActivities] = useState<PodActivityItem[]>([]);
  const [boardLoaded, setBoardLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const newestTsRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docCommentTextRef = useRef<HTMLDivElement>(null);

  const fetchPods = useCallback(async () => {
    try {
      const res = await fetch('/api/pods');
      if (!res.ok) throw new Error('Failed to load pods');
      const data = await res.json();
      setPods(data.pods || []);
    } catch {
      setError('Could not load your pods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchPods();
  }, [status, fetchPods]);

  const bootstrapPod = useCallback(async (pod: PodSummary) => {
    setBootstrapping(true);
    setError('');
    setMessages([]);
    setReactions({});
    setMembers([]);
    setPolls([]);
    setDocuments([]);
    setMyStats(null);
    newestTsRef.current = null;
    try {
      const res = await fetch(`/api/pods?action=bootstrap&podId=${pod.id}`);
      if (!res.ok) throw new Error('Failed to open pod');
      const data = await res.json();
      const msgs: PodMessage[] = data.messages || [];
      setMessages(msgs);
      setMembers(data.members || []);
      setReactions(data.reactions || {});
      setPolls(data.polls || []);
      setDocuments(data.documents || []);
      setMyStats(data.myStats || null);
      setAchievementDefs(data.achievements || []);
      if (msgs.length > 0) newestTsRef.current = msgs[msgs.length - 1].createdAt;
    } catch {
      setError('Could not open this pod.');
    } finally {
      setBootstrapping(false);
    }
  }, []);

  const handleSelectPod = useCallback(
    (pod: PodSummary) => {
      setSelectedPod(pod);
      setActiveTab('chat');
      setMobileShowChat(true);
      setSelectedSession(null);
      setSessionsLoaded(false);
      setBoardLoaded(false);
      setSessions([]);
      setLeaderboard([]);
      setActivities([]);
      setReplyToMsg(null);
      setShowSearch(false);
      setSearchQuery('');
      bootstrapPod(pod);
    },
    [bootstrapPod]
  );

  const runSync = useCallback(async () => {
    if (!selectedPod) return;
    try {
      const after = newestTsRef.current;
      const url = after
        ? `/api/pods?action=sync&podId=${selectedPod.id}&after=${encodeURIComponent(after)}`
        : `/api/pods?action=sync&podId=${selectedPod.id}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const incoming: PodMessage[] = data.messages || [];
      if (incoming.length > 0) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const fresh = incoming.filter((m) => !existing.has(m.id));
          if (fresh.length === 0) return prev;
          const merged = [...prev, ...fresh];
          newestTsRef.current = merged[merged.length - 1].createdAt;
          return merged;
        });
      }
      if (data.reactions) setReactions(data.reactions);
    } catch {
      /* silent poll failure */
    }
  }, [selectedPod]);

  useEffect(() => {
    if (!selectedPod || activeTab !== 'chat') return;
    const id = setInterval(runSync, 5000);
    return () => clearInterval(id);
  }, [selectedPod, activeTab, runSync]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages.length, activeTab]);

  const handleSend = useCallback(async () => {
    const content = messageText.trim();
    if (!content || !selectedPod) return;
    const tempId = `temp-${Date.now()}`;
    const parentId = replyToMsg?.id || null;
    const optimistic: PodMessage = {
      id: tempId,
      podId: selectedPod.id,
      userId: currentUserId,
      content,
      type: 'text',
      essayId: null,
      parentId,
      createdAt: new Date().toISOString(),
      user: { id: currentUserId, name: currentUserName },
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setMessageText('');
    setReplyToMsg(null);
    if (textareaRef.current) textareaRef.current.style.height = '40px';

    setShowTyping(true);
    setTimeout(() => setShowTyping(false), 2000);

    try {
      const res = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', podId: selectedPod.id, content, parentId }),
      });
      if (!res.ok) throw new Error('send failed');
      const data = await res.json();
      const real: PodMessage = data.message;
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
        const merged = [...withoutTemp, real];
        newestTsRef.current = merged[merged.length - 1].createdAt;
        return merged;
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageText(content);
      setError('Message failed to send.');
      setTimeout(() => setError(''), 3000);
    }
  }, [messageText, selectedPod, replyToMsg, currentUserId, currentUserName]);

  const handleToggleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!selectedPod) return;
      setReactions((prev) => {
        const next: ReactionMap = { ...prev };
        const forMsg = { ...(next[messageId] || {}) };
        const users = forMsg[emoji] ? [...forMsg[emoji]] : [];
        const idx = users.indexOf(currentUserId);
        if (idx >= 0) users.splice(idx, 1);
        else users.push(currentUserId);
        if (users.length === 0) delete forMsg[emoji];
        else forMsg[emoji] = users;
        next[messageId] = forMsg;
        return next;
      });
      fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-reaction', podId: selectedPod.id, messageId, emoji }),
      }).catch(() => undefined);
    },
    [selectedPod, currentUserId]
  );

  const handleReply = useCallback((message: PodMessage) => {
    setReplyToMsg(message);
    textareaRef.current?.focus();
  }, []);

  const handleOpenPicker = useCallback((messageId: string) => {
    setPickerFor((prev) => (prev === messageId ? null : messageId));
  }, []);

  const handleClosePicker = useCallback(() => setPickerFor(null), []);

  const handleCreatePod = useCallback(async () => {
    if (!newPodName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: newPodName.trim(), description: newPodDesc.trim() }),
      });
      if (!res.ok) throw new Error('create failed');
      const data = await res.json();
      setNewPodName('');
      setNewPodDesc('');
      setShowCreate(false);
      await fetchPods();
      if (data.pod) {
        handleSelectPod({
          id: data.pod.id,
          name: data.pod.name,
          description: data.pod.description,
          inviteCode: data.pod.inviteCode,
          memberCount: 1,
          myRole: 'owner',
          lastMessage: null,
          joinedAt: new Date().toISOString(),
        });
      }
    } catch {
      setError('Could not create pod.');
    } finally {
      setCreating(false);
    }
  }, [newPodName, newPodDesc, fetchPods, handleSelectPod]);

  const handleJoinPod = useCallback(async () => {
    if (!joinCode.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/pods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', inviteCode: joinCode.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'join failed');
      }
      setJoinCode('');
      setShowJoin(false);
      await fetchPods();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join pod.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setCreating(false);
    }
  }, [joinCode, fetchPods]);

  const handleLeavePod = useCallback(async () => {
    if (!selectedPod) return;
    try {
      await fetch('/api/pods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podId: selectedPod.id }),
      });
      setSelectedPod(null);
      setMobileShowChat(false);
      setConfirmLeave(false);
      setShowMembers(false);
      await fetchPods();
    } catch {
      setError('Could not leave pod.');
    }
  }, [selectedPod, fetchPods]);

  const handleCopyInvite = useCallback(() => {
    if (!selectedPod) return;
    navigator.clipboard?.writeText(selectedPod.inviteCode).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedPod]);

  const handleCreatePoll = useCallback(async () => {
    if (!selectedPod || !pollQuestion.trim()) return;
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) return;
    try {
      const res = await fetch('/api/pod-engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-poll', podId: selectedPod.id, question: pollQuestion.trim(), options: opts }),
      });
      if (!res.ok) throw new Error('poll failed');
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowCreatePoll(false);
      const data = await res.json();
      if (data.poll) setPolls((prev) => [data.poll, ...prev]);
    } catch {
      setError('Could not create poll.');
    }
  }, [selectedPod, pollQuestion, pollOptions]);

  const handleVotePoll = useCallback(
    async (pollId: string, optionIdx: number) => {
      if (!selectedPod) return;
      try {
        const res = await fetch('/api/pod-engage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'vote-poll', podId: selectedPod.id, pollId, optionIdx }),
        });
        if (!res.ok) throw new Error('vote failed');
        const data = await res.json();
        if (data.poll) setPolls((prev) => prev.map((p) => (p.id === pollId ? data.poll : p)));
      } catch {
        setError('Could not record vote.');
      }
    },
    [selectedPod]
  );

  const readFile = (file: File): Promise<{ dataUrl: string; text: string | null }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')) {
          const textReader = new FileReader();
          textReader.onload = () => resolve({ dataUrl, text: textReader.result as string });
          textReader.onerror = () => resolve({ dataUrl, text: null });
          textReader.readAsText(file);
        } else {
          resolve({ dataUrl, text: null });
        }
      };
      reader.onerror = () => reject(new Error('read error'));
      reader.readAsDataURL(file);
    });

  const handleUpload = useCallback(
    async (file: File) => {
      if (!selectedPod) return;
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large (max 5MB).');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setUploading(true);
      try {
        const { dataUrl, text } = await readFile(file);
        const fileType = fileTypeFromName(file.name, file.type);
        const res = await fetch('/api/pod-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload',
            podId: selectedPod.id,
            fileName: file.name,
            fileType,
            fileSize: file.size,
            content: text,
            fileData: dataUrl,
          }),
        });
        if (!res.ok) throw new Error('upload failed');
        const data = await res.json();
        if (data.document) setDocuments((prev) => [data.document, ...prev]);
        runSync();
      } catch {
        setError('Upload failed.');
        setTimeout(() => setError(''), 3000);
      } finally {
        setUploading(false);
      }
    },
    [selectedPod, runSync]
  );

  const openDocModal = useCallback(async (docId: string) => {
    setDocModalId(docId);
    setDocModal(null);
    setDocModalLoading(true);
    setDocContent('');
    setDocDirty(false);
    setDocZoom(100);
    try {
      const res = await fetch(`/api/pod-documents?documentId=${docId}`);
      if (!res.ok) throw new Error('doc failed');
      const data = await res.json();
      setDocModal(data.document);
      setDocContent(data.document?.content || '');
    } catch {
      setError('Could not load document.');
      setDocModalId(null);
    } finally {
      setDocModalLoading(false);
    }
  }, []);

  const closeDocModal = useCallback(() => {
    setDocModalId(null);
    setDocModal(null);
    setShowSelectionPopup(false);
  }, []);

  useEffect(() => {
    if (!docModalId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDocModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [docModalId, closeDocModal]);

  const refreshDocModal = useCallback(async () => {
    if (!docModalId) return;
    try {
      const res = await fetch(`/api/pod-documents?documentId=${docModalId}`);
      if (!res.ok) return;
      const data = await res.json();
      setDocModal((prev) =>
        prev ? { ...prev, comments: data.document?.comments || [] } : data.document
      );
    } catch {
      /* silent */
    }
  }, [docModalId]);

  useEffect(() => {
    if (!docModalId) return;
    const id = setInterval(refreshDocModal, 5000);
    return () => clearInterval(id);
  }, [docModalId, refreshDocModal]);

  const handleSaveDoc = useCallback(async () => {
    if (!docModal) return;
    setDocSaving(true);
    try {
      const res = await fetch('/api/pod-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', documentId: docModal.id, content: docContent }),
      });
      if (!res.ok) throw new Error('save failed');
      setDocDirty(false);
    } catch {
      setError('Could not save document.');
    } finally {
      setDocSaving(false);
    }
  }, [docModal, docContent]);

  const postDocComment = useCallback(
    async (content: string, section: string, parentId: string | null) => {
      if (!docModal || !content.trim()) return;
      try {
        const res = await fetch('/api/pod-documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'comment',
            documentId: docModal.id,
            content: content.trim(),
            parentId: parentId || undefined,
            section: section || undefined,
          }),
        });
        if (!res.ok) throw new Error('comment failed');
        await refreshDocModal();
      } catch {
        setError('Could not post comment.');
      }
    },
    [docModal, refreshDocModal]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await fetch('/api/pod-documents', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId }),
        });
        await refreshDocModal();
      } catch {
        /* silent */
      }
    },
    [refreshDocModal]
  );

  const handleDeleteDoc = useCallback(async () => {
    if (!docModal) return;
    try {
      await fetch('/api/pod-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docModal.id }),
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docModal.id));
      closeDocModal();
    } catch {
      setError('Could not delete document.');
    }
  }, [docModal, closeDocModal]);

  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() || '';
    if (text && docCommentTextRef.current?.contains(sel?.anchorNode || null)) {
      setSelectionText(text);
      setShowSelectionPopup(true);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    if (!selectedPod) return;
    try {
      const res = await fetch(`/api/pod-sessions?podId=${selectedPod.id}`);
      if (!res.ok) throw new Error('sessions failed');
      const data = await res.json();
      setSessions(data.sessions || []);
      setSessionsLoaded(true);
      if (selectedSession) {
        const updated = (data.sessions || []).find((s: StudySession) => s.id === selectedSession.id);
        if (updated) setSelectedSession(updated);
      }
    } catch {
      setSessionsLoaded(true);
    }
  }, [selectedPod, selectedSession]);

  useEffect(() => {
    if (activeTab === 'focus' && selectedPod && !sessionsLoaded) fetchSessions();
  }, [activeTab, selectedPod, sessionsLoaded, fetchSessions]);

  useEffect(() => {
    if (activeTab !== 'focus' || !selectedSession) return;
    if (selectedSession.status !== 'active' && selectedSession.status !== 'break') return;
    const id = setInterval(fetchSessions, 10000);
    return () => clearInterval(id);
  }, [activeTab, selectedSession, fetchSessions]);

  useEffect(() => {
    if (!selectedSession || !selectedSession.endsAt) {
      setTimerDisplay('');
      return;
    }
    if (selectedSession.status !== 'active' && selectedSession.status !== 'break') {
      setTimerDisplay('');
      return;
    }
    const tick = () => {
      const end = new Date(selectedSession.endsAt as string).getTime();
      const remaining = Math.max(0, end - Date.now());
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setTimerDisplay(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [selectedSession]);

  const sessionAction = useCallback(
    async (action: string, extra: Record<string, unknown>) => {
      try {
        const res = await fetch('/api/pod-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        });
        if (!res.ok) throw new Error('session action failed');
        const data = await res.json();
        await fetchSessions();
        if (data.session) setSelectedSession(data.session);
      } catch {
        setError('Session action failed.');
        setTimeout(() => setError(''), 3000);
      }
    },
    [fetchSessions]
  );

  const handleCreateSession = useCallback(async () => {
    if (!selectedPod || !sessionTitle.trim()) return;
    await sessionAction('create', {
      podId: selectedPod.id,
      title: sessionTitle.trim(),
      focusDuration: sessionFocus,
      breakDuration: sessionBreak,
      rounds: sessionRounds,
      goal: sessionGoal.trim(),
    });
    setShowCreateSession(false);
    setSessionGoal('');
  }, [selectedPod, sessionTitle, sessionFocus, sessionBreak, sessionRounds, sessionGoal, sessionAction]);

  const fetchBoard = useCallback(async () => {
    if (!selectedPod) return;
    try {
      const [lbRes, actRes] = await Promise.all([
        fetch(`/api/pod-engage?action=leaderboard&podId=${selectedPod.id}`),
        fetch(`/api/pod-engage?action=activity&podId=${selectedPod.id}`),
      ]);
      const lbData = lbRes.ok ? await lbRes.json() : { leaderboard: [] };
      const actData = actRes.ok ? await actRes.json() : { activities: [] };
      setLeaderboard(lbData.leaderboard || []);
      setActivities(actData.activities || []);
      setBoardLoaded(true);
    } catch {
      setBoardLoaded(true);
    }
  }, [selectedPod]);

  useEffect(() => {
    if (activeTab === 'leaderboard' && selectedPod && !boardLoaded) fetchBoard();
  }, [activeTab, selectedPod, boardLoaded, fetchBoard]);

  const messageById = useMemo(() => {
    const map: Record<string, PodMessage> = {};
    for (const m of messages) map[m.id] = m;
    return map;
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) => m.content.toLowerCase().includes(q) || m.user.name.toLowerCase().includes(q)
    );
  }, [messages, showSearch, searchQuery]);

  const groupedMessages = useMemo(() => {
    const items: { message: PodMessage; grouped: boolean; showDate: boolean }[] = [];
    for (let i = 0; i < filteredMessages.length; i++) {
      const msg = filteredMessages[i];
      const prev = filteredMessages[i - 1];
      const showDate = !prev || dateLabel(prev.createdAt) !== dateLabel(msg.createdAt);
      const grouped =
        !!prev &&
        !showDate &&
        prev.userId === msg.userId &&
        !msg.parentId &&
        new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300000;
      items.push({ message: msg, grouped, showDate });
    }
    return items;
  }, [filteredMessages]);

  const isOwner = selectedPod?.myRole === 'owner' || selectedPod?.myRole === 'admin';

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-8rem)] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (status !== 'authenticated') return null;

  const myStatsAchievements = parseAchievements(myStats?.achievements || '[]');

  return (
    <DashboardLayout>
      <Head>
        <title>Study Pods | AdmitsOnly</title>
      </Head>

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl shadow-sm">
          {error}
        </div>
      )}

      <div className="h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-8rem)]">
        <div className="flex h-full bg-white rounded-2xl overflow-hidden border border-slate-100">
          {/* Sidebar */}
          <aside
            className={`${
              mobileShowChat ? 'hidden' : 'flex'
            } lg:flex flex-col w-full lg:w-[280px] bg-white border-r border-slate-200 flex-shrink-0`}
          >
            <div className="p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-primary">Study Pods</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setShowJoin((v) => !v);
                      setShowCreate(false);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-50"
                    title="Join pod"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreate((v) => !v);
                      setShowJoin(false);
                    }}
                    className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20"
                    title="Create pod"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>

              {showCreate && (
                <div className="space-y-2 mb-2 p-3 bg-slate-50 rounded-xl">
                  <input
                    value={newPodName}
                    onChange={(e) => setNewPodName(e.target.value)}
                    placeholder="Pod name"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                  <textarea
                    value={newPodDesc}
                    onChange={(e) => setNewPodDesc(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                  />
                  <button
                    onClick={handleCreatePod}
                    disabled={creating || !newPodName.trim()}
                    className="w-full py-2 text-sm font-medium rounded-lg bg-accent text-white disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Pod'}
                  </button>
                </div>
              )}

              {showJoin && (
                <div className="space-y-2 mb-2 p-3 bg-slate-50 rounded-xl">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Invite code"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none uppercase"
                  />
                  <button
                    onClick={handleJoinPod}
                    disabled={creating || !joinCode.trim()}
                    className="w-full py-2 text-sm font-medium rounded-lg bg-accent text-white disabled:opacity-50"
                  >
                    {creating ? 'Joining...' : 'Join Pod'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5" style={{ overscrollBehavior: 'contain' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pods.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-slate-400">No pods yet. Create or join one.</p>
                </div>
              ) : (
                pods.map((pod) => (
                  <PodListItem key={pod.id} pod={pod} selected={selectedPod?.id === pod.id} onSelect={handleSelectPod} />
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={currentUserName} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{currentUserName}</p>
                  {myStats && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="text-accent font-medium">{myStats.xp} XP</span>
                      <span>🔥 {myStats.currentStreak}d</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Chat / main panel */}
          <section
            className={`${mobileShowChat ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0`}
          >
            {!selectedPod ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
                </svg>
                <p className="text-sm text-slate-400">Select a pod to start collaborating.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex-shrink-0 border-b border-slate-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => setMobileShowChat(false)}
                      className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-primary"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <Avatar name={selectedPod.name} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-primary truncate">{selectedPod.name}</h3>
                      <p className="text-xs text-slate-400 truncate">{selectedPod.memberCount} members</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {activeTab === 'chat' && (
                        <button
                          onClick={() => {
                            setShowSearch((v) => !v);
                            setSearchQuery('');
                          }}
                          className={`p-2 rounded-lg ${showSearch ? 'text-accent bg-accent/10' : 'text-slate-400 hover:text-primary hover:bg-slate-50'}`}
                          title="Search messages"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => setShowInvite((v) => !v)}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50"
                        title="Invite code"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setShowMembers((v) => !v)}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50"
                        title="Members"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {showInvite && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 flex-1">
                        <span className="text-xs text-slate-400">Invite code:</span>
                        <span className="text-sm font-mono font-semibold text-primary tracking-wider">{selectedPod.inviteCode}</span>
                      </div>
                      <button
                        onClick={handleCopyInvite}
                        className="relative px-3 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}

                  {showMembers && (
                    <div className="px-4 pb-3 max-h-48 overflow-y-auto">
                      <div className="bg-slate-50 rounded-xl p-2 space-y-1">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 px-2 py-1.5">
                            <Avatar name={m.user.name} size="sm" />
                            <span className="text-sm text-primary flex-1 truncate">{m.user.name}</span>
                            {(m.role === 'owner' || m.role === 'admin') && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium capitalize">{m.role}</span>
                            )}
                          </div>
                        ))}
                        <div className="pt-1 mt-1 border-t border-slate-200">
                          {confirmLeave ? (
                            <div className="flex items-center gap-2 px-2 py-1">
                              <span className="text-xs text-slate-500 flex-1">Leave this pod?</span>
                              <button onClick={handleLeavePod} className="text-xs font-medium text-red-600 hover:underline">Yes</button>
                              <button onClick={() => setConfirmLeave(false)} className="text-xs font-medium text-slate-400 hover:underline">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmLeave(true)} className="w-full text-left px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg">
                              Leave pod
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {showSearch && activeTab === 'chat' && (
                    <div className="px-4 pb-3">
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search messages..."
                        autoFocus
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                      />
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex items-center gap-1 px-3 border-t border-slate-100">
                    {([
                      ['chat', 'Chat'],
                      ['documents', 'Files'],
                      ['focus', 'Focus'],
                      ['leaderboard', 'Board'],
                    ] as [TabKey, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === key
                            ? 'border-accent text-accent'
                            : 'border-transparent text-slate-400 hover:text-primary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                {activeTab === 'chat' && (
                  <>
                    <div
                      className="flex-1 overflow-y-auto py-2"
                      style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
                    >
                      {bootstrapping ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : groupedMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                          <svg className="w-10 h-10 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-sm text-slate-400">
                            {showSearch && searchQuery ? 'No matching messages.' : 'No messages yet. Say hello!'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {groupedMessages.map(({ message, grouped, showDate }) => {
                            const parentMsg =
                              message.parentId && messageById[message.parentId]
                                ? messageById[message.parentId]
                                : null;
                            const poll = message.type === 'poll' ? polls.find((p) => p.id === message.essayId) : null;
                            const doc = message.type === 'document' ? documents.find((d) => d.id === message.essayId) : null;
                            return (
                              <div key={message.id}>
                                {showDate && (
                                  <div className="flex items-center gap-3 px-4 my-3">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[11px] font-medium text-slate-400">{dateLabel(message.createdAt)}</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                  </div>
                                )}
                                <MessageRow
                                  message={message}
                                  grouped={grouped}
                                  isMine={message.userId === currentUserId}
                                  parent={parentMsg}
                                  reactions={reactions[message.id]}
                                  currentUserId={currentUserId}
                                  onToggleReaction={handleToggleReaction}
                                  onReply={handleReply}
                                  onOpenPicker={handleOpenPicker}
                                  pickerOpen={pickerFor === message.id}
                                  onClosePicker={handleClosePicker}
                                />
                                {poll && (
                                  <div className="px-4 pl-16 mt-1">
                                    <PollCard poll={poll} currentUserId={currentUserId} onVote={handleVotePoll} />
                                  </div>
                                )}
                                {doc && (
                                  <div className="px-4 pl-16 mt-1">
                                    <button
                                      onClick={() => openDocModal(doc.id)}
                                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-accent/40 hover:bg-slate-50 max-w-sm w-full text-left"
                                    >
                                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getFileColor(doc.fileType)}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={getFileIcon(doc.fileType)} />
                                        </svg>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-primary truncate">{doc.fileName}</p>
                                        <p className="text-xs text-slate-400">{formatFileSize(doc.fileSize)}</p>
                                      </div>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {showTyping && (
                            <div className="flex items-center gap-2 px-4 mt-2 text-xs text-slate-400">
                              <div className="flex gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              typing...
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    {/* Input bar */}
                    <div className="flex-shrink-0 border-t border-slate-100 p-3">
                      {replyToMsg && (
                        <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a4 4 0 014 4v0M3 10l4-4M3 10l4 4" />
                          </svg>
                          <span className="text-xs text-slate-500 flex-1 truncate">
                            Replying to <span className="font-medium">{replyToMsg.user.name}</span>: {replyToMsg.content}
                          </span>
                          <button onClick={() => setReplyToMsg(null)} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}
                      <div className="flex items-end gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-50 flex-shrink-0"
                          title="Attach file"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowCreatePoll((v) => !v)}
                          className="p-2 rounded-lg text-slate-400 hover:text-accent hover:bg-slate-50 flex-shrink-0"
                          title="Create poll"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </button>
                        <textarea
                          ref={textareaRef}
                          value={messageText}
                          onChange={(e) => {
                            setMessageText(e.target.value);
                            const el = e.target;
                            el.style.height = '40px';
                            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          rows={1}
                          placeholder="Type a message..."
                          className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
                          style={{ minHeight: '40px', maxHeight: '120px', height: '40px' }}
                        />
                        <button
                          onClick={handleSend}
                          disabled={!messageText.trim()}
                          className={`p-2 rounded-lg flex-shrink-0 transition-colors ${
                            messageText.trim() ? 'bg-accent text-white' : 'text-slate-300'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>

                      {showCreatePoll && (
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl space-y-2">
                          <input
                            value={pollQuestion}
                            onChange={(e) => setPollQuestion(e.target.value)}
                            placeholder="Poll question"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                          />
                          {pollOptions.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                value={opt}
                                onChange={(e) => setPollOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                                placeholder={`Option ${i + 1}`}
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                              />
                              {pollOptions.length > 2 && (
                                <button
                                  onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            {pollOptions.length < 6 && (
                              <button
                                onClick={() => setPollOptions((prev) => [...prev, ''])}
                                className="text-xs font-medium text-accent hover:underline"
                              >
                                + Add option
                              </button>
                            )}
                            <button
                              onClick={handleCreatePoll}
                              disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                              className="ml-auto px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white disabled:opacity-50"
                            >
                              Create Poll
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeTab === 'documents' && (
                  <div className="flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleUpload(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        dragOver ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-accent/40'
                      }`}
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-slate-500">Click or drag a file to upload</p>
                          <p className="text-xs text-slate-400 mt-1">PDF, TXT, DOC, DOCX, images · max 5MB</p>
                        </>
                      )}
                    </div>

                    <div className="mt-4 space-y-2">
                      {documents.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-sm text-slate-400">No documents shared yet.</p>
                        </div>
                      ) : (
                        documents.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => openDocModal(doc.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-accent/40 hover:bg-slate-50 text-left"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileColor(doc.fileType)}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={getFileIcon(doc.fileType)} />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-primary truncate">{doc.fileName}</p>
                              <p className="text-xs text-slate-400">
                                {doc.uploader.name} · {formatFileSize(doc.fileSize)}
                                {doc._count?.comments ? ` · ${doc._count.comments} comments` : ''}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'focus' && (
                  <div className="flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
                    {selectedSession ? (
                      <SessionDetail
                        session={selectedSession}
                        currentUserId={currentUserId}
                        timerDisplay={timerDisplay}
                        joinGoal={joinGoal}
                        setJoinGoal={setJoinGoal}
                        onBack={() => setSelectedSession(null)}
                        onAction={sessionAction}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-primary">Focus Sessions</h3>
                          <button
                            onClick={() => setShowCreateSession((v) => !v)}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent/10 text-accent hover:bg-accent/20"
                          >
                            New Session
                          </button>
                        </div>

                        {showCreateSession && (
                          <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-2">
                            <input
                              value={sessionTitle}
                              onChange={(e) => setSessionTitle(e.target.value)}
                              placeholder="Session title"
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <label className="text-xs text-slate-500">
                                Focus (min)
                                <input
                                  type="number"
                                  value={sessionFocus}
                                  onChange={(e) => setSessionFocus(Number(e.target.value))}
                                  className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-accent"
                                />
                              </label>
                              <label className="text-xs text-slate-500">
                                Break (min)
                                <input
                                  type="number"
                                  value={sessionBreak}
                                  onChange={(e) => setSessionBreak(Number(e.target.value))}
                                  className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-accent"
                                />
                              </label>
                              <label className="text-xs text-slate-500">
                                Rounds
                                <input
                                  type="number"
                                  value={sessionRounds}
                                  onChange={(e) => setSessionRounds(Number(e.target.value))}
                                  className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-accent"
                                />
                              </label>
                            </div>
                            <input
                              value={sessionGoal}
                              onChange={(e) => setSessionGoal(e.target.value)}
                              placeholder="Your goal for this session"
                              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                            />
                            <button
                              onClick={handleCreateSession}
                              disabled={!sessionTitle.trim()}
                              className="w-full py-2 text-sm font-medium rounded-lg bg-accent text-white disabled:opacity-50"
                            >
                              Create Session
                            </button>
                          </div>
                        )}

                        {!sessionsLoaded ? (
                          <div className="flex items-center justify-center py-10">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="text-center py-10">
                            <p className="text-sm text-slate-400">No focus sessions yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => setSelectedSession(s)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-accent/40 hover:bg-slate-50 text-left"
                              >
                                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-primary truncate">{s.title}</p>
                                  <p className="text-xs text-slate-400">
                                    {s.focusDuration}m focus · {s.rounds} rounds · {s._count?.participants ?? s.participants.length} joined
                                  </p>
                                </div>
                                <SessionStatusBadge status={s.status} />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <div className="flex-1 overflow-y-auto p-4" style={{ overscrollBehavior: 'contain' }}>
                    {!boardLoaded ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="bg-accent/5 rounded-xl p-4 border border-accent/10">
                          <h3 className="text-sm font-bold text-primary mb-3">Your Stats</h3>
                          <div className="grid grid-cols-3 gap-3">
                            <StatTile label="XP" value={statValue(myStats, 'xp')} />
                            <StatTile label="Messages" value={statValue(myStats, 'messagesCount')} />
                            <StatTile label="Sessions" value={statValue(myStats, 'sessionsCount')} />
                            <StatTile label="Streak" value={statValue(myStats, 'currentStreak')} suffix="d" />
                            <StatTile label="Best Streak" value={statValue(myStats, 'longestStreak')} suffix="d" />
                            <StatTile label="Reactions" value={statValue(myStats, 'reactionsGiven')} />
                          </div>
                          {myStatsAchievements.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-accent/10">
                              {achievementDefs
                                .filter((a) => myStatsAchievements.includes(a.id))
                                .map((a) => (
                                  <span
                                    key={a.id}
                                    title={a.desc}
                                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-white text-xs font-medium text-primary border border-slate-200"
                                  >
                                    <span>{a.icon}</span>
                                    {a.label}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-primary mb-2">Pod Rankings</h3>
                          <div className="space-y-1.5">
                            {leaderboard.length === 0 ? (
                              <p className="text-sm text-slate-400">No rankings yet.</p>
                            ) : (
                              leaderboard.map((s, i) => (
                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                                  <span className="w-6 text-center text-sm font-bold text-slate-400">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                  </span>
                                  <Avatar name={s.user?.name || 'User'} size="sm" />
                                  <span className="flex-1 text-sm font-medium text-primary truncate">{s.user?.name || 'User'}</span>
                                  <span className="text-sm font-semibold text-accent">{s.xp} XP</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-primary mb-2">Recent Activity</h3>
                          <div className="space-y-1.5">
                            {activities.length === 0 ? (
                              <p className="text-sm text-slate-400">No recent activity.</p>
                            ) : (
                              activities.map((a) => (
                                <div key={a.id} className="flex items-center gap-2.5 p-2 text-sm">
                                  <Avatar name={a.user.name} size="sm" />
                                  <span className="flex-1 text-slate-600">
                                    <span className="font-medium text-primary">{a.user.name}</span>{' '}
                                    {a.type.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-xs text-slate-400">{formatRelative(a.createdAt)}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-primary mb-2">All Achievements</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {achievementDefs.map((a) => {
                              const unlocked = myStatsAchievements.includes(a.id);
                              return (
                                <div
                                  key={a.id}
                                  className={`p-3 rounded-xl border text-center ${
                                    unlocked ? 'border-accent/30 bg-accent/5' : 'border-slate-100 bg-slate-50 opacity-60'
                                  }`}
                                >
                                  <div className={`text-2xl mb-1 ${unlocked ? '' : 'grayscale'}`}>{a.icon}</div>
                                  <p className="text-xs font-semibold text-primary">{a.label}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{a.desc}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = '';
        }}
      />

      {/* Document modal */}
      {docModalId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/30" onClick={closeDocModal} />
          <div className="relative bg-white rounded-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col overflow-hidden shadow-sm">
            {docModalLoading || !docModal ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${getFileColor(docModal.fileType)}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={getFileIcon(docModal.fileType)} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-primary truncate">{docModal.fileName}</p>
                    <p className="text-xs text-slate-400">{docModal.uploader.name} · {formatFileSize(docModal.fileSize)}</p>
                  </div>
                  {(docModal.fileType === 'image' || docModal.fileType === 'pdf') && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDocZoom((z) => Math.max(25, z - 25))} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                      </button>
                      <span className="text-xs text-slate-500 w-10 text-center">{docZoom}%</span>
                      <button onClick={() => setDocZoom((z) => Math.min(300, z + 25))} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  )}
                  {docDirty && (
                    <button onClick={handleSaveDoc} disabled={docSaving} className="px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-white disabled:opacity-50">
                      {docSaving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                  {docModal.fileData && (
                    <a href={docModal.fileData} download={docModal.fileName} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50" title="Download">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                  )}
                  {docModal.uploaderId === currentUserId && (
                    <button onClick={handleDeleteDoc} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" title="Delete">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <button onClick={closeDocModal} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 flex min-h-0">
                  <div className="flex-1 min-w-0 overflow-auto p-4 bg-slate-50 relative">
                    {docModal.fileType === 'txt' ? (
                      <div ref={docCommentTextRef} onMouseUp={handleTextSelection}>
                        <textarea
                          value={docContent}
                          onChange={(e) => {
                            setDocContent(e.target.value);
                            setDocDirty(true);
                          }}
                          className="w-full h-full min-h-[60vh] p-4 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-accent resize-none font-mono leading-relaxed"
                        />
                        {showSelectionPopup && (
                          <div className="absolute top-4 right-4 z-10 bg-white border border-slate-200 rounded-xl shadow-sm p-3 w-64">
                            <p className="text-xs text-slate-400 mb-1 truncate">On: &ldquo;{selectionText}&rdquo;</p>
                            <textarea
                              value={selectionComment}
                              onChange={(e) => setSelectionComment(e.target.value)}
                              placeholder="Comment on selection..."
                              rows={2}
                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-accent resize-none"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => { setShowSelectionPopup(false); setSelectionComment(''); }} className="text-xs text-slate-400">Cancel</button>
                              <button
                                onClick={async () => {
                                  await postDocComment(selectionComment, selectionText, null);
                                  setShowSelectionPopup(false);
                                  setSelectionComment('');
                                }}
                                disabled={!selectionComment.trim()}
                                className="px-2 py-1 text-xs font-medium rounded-lg bg-accent text-white disabled:opacity-50"
                              >
                                Comment
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : docModal.fileType === 'image' && docModal.fileData ? (
                      <div className="flex items-center justify-center min-h-full">
                        <img src={docModal.fileData} alt={docModal.fileName} style={{ width: `${docZoom}%` }} className="rounded-lg" />
                      </div>
                    ) : docModal.fileType === 'pdf' && docModal.fileData ? (
                      <div className="h-full" style={{ zoom: `${docZoom}%` }}>
                        <iframe src={docModal.fileData} title={docModal.fileName} className="w-full h-full min-h-[70vh] rounded-lg border border-slate-200" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center min-h-full text-center">
                        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={getFileIcon(docModal.fileType)} />
                        </svg>
                        <p className="text-sm text-slate-400 mb-3">Preview not available for this file type.</p>
                        {docModal.fileData && (
                          <a href={docModal.fileData} download={docModal.fileName} className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white">Download</a>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="w-72 flex-shrink-0 border-l border-slate-100 flex flex-col">
                    <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
                      <h4 className="text-sm font-bold text-primary">Comments</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ overscrollBehavior: 'contain' }}>
                      {(!docModal.comments || docModal.comments.length === 0) ? (
                        <p className="text-sm text-slate-400 text-center py-6">No comments yet.</p>
                      ) : (
                        docModal.comments.map((c) => (
                          <DocCommentItem
                            key={c.id}
                            comment={c}
                            currentUserId={currentUserId}
                            replyTo={docReplyTo}
                            replyText={docReplyText}
                            setReplyTo={setDocReplyTo}
                            setReplyText={setDocReplyText}
                            onPostReply={postDocComment}
                            onDelete={handleDeleteComment}
                          />
                        ))
                      )}
                    </div>
                    <div className="p-3 border-t border-slate-100 flex-shrink-0">
                      <div className="flex items-end gap-2">
                        <textarea
                          value={docComment}
                          onChange={(e) => setDocComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={1}
                          className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-accent resize-none"
                        />
                        <button
                          onClick={async () => {
                            await postDocComment(docComment, '', null);
                            setDocComment('');
                          }}
                          disabled={!docComment.trim()}
                          className={`p-2 rounded-lg ${docComment.trim() ? 'bg-accent text-white' : 'text-slate-300'}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatTile({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="bg-white rounded-lg p-2.5 text-center border border-slate-100">
      <p className="text-lg font-bold text-primary">
        {value}
        {suffix || ''}
      </p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    waiting: 'bg-slate-100 text-slate-500',
    active: 'bg-emerald-100 text-emerald-600',
    break: 'bg-amber-100 text-amber-600',
    completed: 'bg-slate-100 text-slate-400',
  };
  return (
    <span className={`text-[10px] px-2 py-1 rounded-full font-medium capitalize ${map[status] || 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  );
}

interface PollCardProps {
  poll: PodPoll;
  currentUserId: string;
  onVote: (pollId: string, optionIdx: number) => void;
}

const PollCard = memo(function PollCard({ poll, currentUserId, onVote }: PollCardProps) {
  let options: string[] = [];
  try {
    const parsed = JSON.parse(poll.options);
    options = Array.isArray(parsed) ? parsed : [];
  } catch {
    options = [];
  }
  const myVote = poll.votes.find((v) => v.userId === currentUserId);
  const total = poll.votes.length;
  return (
    <div className="max-w-sm rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm font-semibold text-primary">{poll.question}</p>
      </div>
      <div className="space-y-1.5">
        {options.map((opt, i) => {
          const count = poll.votes.filter((v) => v.optionIdx === i).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const voted = myVote?.optionIdx === i;
          return (
            <button
              key={i}
              onClick={() => onVote(poll.id, i)}
              className="w-full relative overflow-hidden rounded-lg border border-slate-200 px-3 py-1.5 text-left hover:border-accent/40"
            >
              <div className="absolute inset-0 bg-accent/10" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between">
                <span className={`text-sm ${voted ? 'font-semibold text-accent' : 'text-slate-600'}`}>{opt}</span>
                <span className="text-xs text-slate-400">{pct}%</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">{total} {total === 1 ? 'vote' : 'votes'}</p>
    </div>
  );
});

interface SessionDetailProps {
  session: StudySession;
  currentUserId: string;
  timerDisplay: string;
  joinGoal: string;
  setJoinGoal: (v: string) => void;
  onBack: () => void;
  onAction: (action: string, extra: Record<string, unknown>) => Promise<void>;
}

function SessionDetail({ session, currentUserId, timerDisplay, joinGoal, setJoinGoal, onBack, onAction }: SessionDetailProps) {
  const isCreator = session.creatorId === currentUserId;
  const myParticipant = session.participants.find((p) => p.userId === currentUserId);
  const joined = !!myParticipant;
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary mb-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to sessions
      </button>

      <div className="text-center py-4">
        <h3 className="text-base font-bold text-primary">{session.title}</h3>
        <div className="flex items-center justify-center gap-2 mt-1">
          <SessionStatusBadge status={session.status} />
          <span className="text-xs text-slate-400">Round {session.currentRound} / {session.rounds}</span>
        </div>
        {(session.status === 'active' || session.status === 'break') && timerDisplay && (
          <div className="mt-4">
            <p className={`text-5xl font-bold tabular-nums ${session.status === 'break' ? 'text-amber-500' : 'text-accent'}`}>{timerDisplay}</p>
            <p className="text-xs text-slate-400 mt-1">{session.status === 'break' ? 'Break time' : 'Focus time'}</p>
          </div>
        )}
      </div>

      {isCreator && (
        <div className="flex items-center gap-2 justify-center mb-4">
          {session.status === 'waiting' && (
            <button onClick={() => onAction('start', { sessionId: session.id })} className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white">Start Session</button>
          )}
          {(session.status === 'active' || session.status === 'break') && (
            <button onClick={() => onAction('advance', { sessionId: session.id })} className="px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent">Advance</button>
          )}
        </div>
      )}

      {!joined && session.status === 'waiting' && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-2">
          <input
            value={joinGoal}
            onChange={(e) => setJoinGoal(e.target.value)}
            placeholder="Your goal for this session"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-accent"
          />
          <button onClick={() => onAction('join', { sessionId: session.id, goal: joinGoal.trim() })} className="w-full py-2 text-sm font-medium rounded-lg bg-accent text-white">Join Session</button>
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-primary mb-2">Participants</h4>
        <div className="space-y-1.5">
          {session.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
              <Avatar name={p.user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">{p.user.name}</p>
                {p.goal && <p className="text-xs text-slate-400 truncate">{p.goal}</p>}
              </div>
              {p.userId === currentUserId ? (
                <button
                  onClick={() => onAction('complete-goal', { sessionId: session.id })}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium ${p.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {p.completed ? '✓ Done' : 'Mark done'}
                </button>
              ) : (
                p.completed && <span className="text-xs text-emerald-600 font-medium">✓ Done</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DocCommentItemProps {
  comment: DocComment;
  currentUserId: string;
  replyTo: string | null;
  replyText: string;
  setReplyTo: (v: string | null) => void;
  setReplyText: (v: string) => void;
  onPostReply: (content: string, section: string, parentId: string | null) => Promise<void>;
  onDelete: (commentId: string) => void;
}

function DocCommentItem({ comment, currentUserId, replyTo, replyText, setReplyTo, setReplyText, onPostReply, onDelete }: DocCommentItemProps) {
  return (
    <div>
      <div className="flex gap-2">
        <Avatar name={comment.user.name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary">{comment.user.name}</span>
            <span className="text-[10px] text-slate-400">{formatRelative(comment.createdAt)}</span>
          </div>
          {comment.section && (
            <p className="text-[11px] text-slate-400 italic border-l-2 border-accent/30 pl-2 mt-1 truncate">&ldquo;{comment.section}&rdquo;</p>
          )}
          <p className="text-sm text-slate-600 mt-0.5 break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-[11px] text-slate-400 hover:text-accent">Reply</button>
            {comment.userId === currentUserId && (
              <button onClick={() => onDelete(comment.id)} className="text-[11px] text-slate-400 hover:text-red-500">Delete</button>
            )}
          </div>
          {replyTo === comment.id && (
            <div className="mt-2 flex items-end gap-1.5">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply..."
                rows={1}
                className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-accent resize-none"
              />
              <button
                onClick={async () => {
                  await onPostReply(replyText, '', comment.id);
                  setReplyText('');
                  setReplyTo(null);
                }}
                disabled={!replyText.trim()}
                className="px-2 py-1.5 text-xs font-medium rounded-lg bg-accent text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          )}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 pl-3 border-l border-slate-100 space-y-2">
              {comment.replies.map((r) => (
                <div key={r.id} className="flex gap-2">
                  <Avatar name={r.user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{r.user.name}</span>
                      <span className="text-[10px] text-slate-400">{formatRelative(r.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600 break-words">{r.content}</p>
                    {r.userId === currentUserId && (
                      <button onClick={() => onDelete(r.id)} className="text-[11px] text-slate-400 hover:text-red-500 mt-0.5">Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
