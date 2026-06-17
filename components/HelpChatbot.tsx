import { useState, useRef, useEffect } from 'react';

/* ──────────────────────── KNOWLEDGE BASE ──────────────────────── */

interface QA {
  keywords: string[];
  question: string;
  answer: string;
}

const knowledgeBase: QA[] = [
  /* ─── Getting Started ─── */
  {
    keywords: ['get started', 'start', 'begin', 'new', 'first', 'how to', 'setup'],
    question: 'How do I get started?',
    answer: "Welcome to AdmitsOnly! Here's your quickstart:\n\n**1.** Go to **Profile** → enter your GPA, SAT scores, and extracurriculars to get your holistic evaluation score.\n\n**2.** Go to **Applications** → add the colleges you're applying to. This powers your Smart Planner and deadline tracking.\n\n**3.** Go to **Essays → Prompts** tab → browse supplemental prompts for your schools and click **\"Start Writing\"** to begin drafting.\n\n**4.** Go to **Study Pods** → create or join a pod to collaborate with peers.\n\nEach feature feeds into the others — your school list populates your essay prompts, and your essays power the reuse engine.",
  },
  /* ─── Navigation ─── */
  {
    keywords: ['navigate', 'find', 'where', 'page', 'menu', 'dashboard', 'sidebar', 'tabs', 'layout'],
    question: 'How do I navigate the dashboard?',
    answer: "Use the **sidebar** (desktop) or **bottom tab bar** (mobile) to switch between sections:\n\n• **Home** — Overview dashboard with quick stats and actions\n• **Profile** — Enter stats, get scored, view your competitiveness\n• **Essays** — Write essays, explore motifs, browse prompts\n• **Applications** — Track schools, deadlines, and tasks\n• **Study Pods** — Group chat with peers\n\nOn mobile, tap the **hamburger menu** (☰) for the full sidebar with settings, billing, and dark mode toggle.\n\nThe **dark mode** toggle is in the top-right header bar, the sidebar, or the mobile menu.",
  },
  /* ─── Profile & Scoring ─── */
  {
    keywords: ['profile', 'score', 'evaluation', 'gpa', 'sat', 'ranking', 'percentile', 'holistic', 'scatterplot'],
    question: 'How does the profile scorer work?',
    answer: "Your holistic score is calculated from three components:\n\n• **GPA (35%)** — your academic performance\n• **SAT Scores (30%)** — math + reading combined\n• **Extracurriculars (35%)** — AI evaluates leadership, depth, breadth, and impact\n\nYour **percentile ranking** compares you against all students on the platform. The **scatterplot** shows where you fall in GPA vs. SAT space with color-coded competitiveness zones (Safety, Match, Reach, Far Reach).\n\nTo update: go to **Profile**, enter your data, and the score updates in real time.",
  },
  /* ─── Essays ─── */
  {
    keywords: ['essay', 'write', 'personal statement', 'draft', 'editor', 'workspace'],
    question: 'How do I work on essays?',
    answer: "The **Essays** page has three modes (tabs at the top):\n\n**1. My Essays** — Create, edit, and manage your essay drafts. Click **\"+ New Essay\"** to start. Each essay gets AI scoring on vocabulary, grammar, originality, and overall strength.\n\n**2. Motifs** — Discover hidden themes across your essays. The Motif Board finds connections between your stories to help build a cohesive narrative.\n\n**3. Prompts** — Browse **140+ real supplemental prompts** from 40 top schools. Filter by school or prompt type. Click any prompt to see:\n  • The full prompt text and word limit\n  • A tailored writing guide\n  • Reuse matches from your existing essays\n  • School research data (for \"Why Us\" prompts)\n  • A **\"Start Writing\"** button that pre-fills the essay editor\n\nPro tip: Write one strong essay per prompt type, then use the **Reuse Engine** to adapt it across schools.",
  },
  /* ─── Supplemental Prompts ─── */
  {
    keywords: ['supplement', 'supplemental', 'prompt', 'prompts', 'college prompt', 'school prompt', 'why us', 'database'],
    question: 'How do supplemental prompts work?',
    answer: "Go to **Essays → Prompts** tab to access the prompt database.\n\n**40 schools** with real supplemental essay prompts, organized by **10 prompt types**: Why Us, Community, Identity, Intellectual Curiosity, Activity/EC, Challenge, Creative, Future/Goals, Diversity, and Roommate.\n\n**Filters**: Use the dropdown menus to filter by specific school or prompt type. Active filters show as badges you can click to clear.\n\n**Clicking a prompt** opens a detailed modal with:\n• Full prompt text and word limit\n• Writing guide specific to that prompt type\n• School acceptance rate, SAT range, and deadlines\n• Your existing essays that could be reused\n• For \"Why Us\" prompts: research data (programs, features, culture)\n\nThe **Reuse Engine** automatically finds which of your essays could be adapted for other schools' prompts, with match scores and adaptation notes.",
  },
  /* ─── Reuse Engine ─── */
  {
    keywords: ['reuse', 'recycle', 'adapt', 'match', 'matching', 'reuse engine', 'essay reuse'],
    question: 'How does the Essay Reuse Engine work?',
    answer: "The Reuse Engine finds opportunities to **adapt your existing essays** for other schools' prompts, saving you time.\n\nIt uses multi-signal scoring:\n• **Type match** — same prompt category (e.g., both are \"Community\" essays)\n• **Cross-type compatibility** — compatible types (e.g., Identity → Community)\n• **Content overlap** — keyword and theme analysis\n• **Theme detection** — matching narrative themes\n\nReuse matches appear:\n• As a **horizontal card strip** at the top of the Prompts tab\n• Inside each **prompt modal** with specific adaptation notes\n\nEach match shows a **percentage score** and tells you exactly what to change to adapt the essay for the new prompt.",
  },
  /* ─── Applications Tracker ─── */
  {
    keywords: ['application', 'tracker', 'deadline', 'school', 'college', 'due', 'date', 'progress', 'checklist', 'task', 'ea', 'ed', 'rd', 'early'],
    question: 'How does the Application Tracker work?',
    answer: "Go to **Applications** to manage your college application list.\n\n**Adding schools**: Click **\"Add School\"** and select from 40 schools in the database. Each school comes with real deadlines and an 8-item task checklist.\n\n**Deadline types**: EA (Early Action), ED (Early Decision), ED2, RD (Regular Decision), REA, Rolling.\n\n**Smart Planner**: Automatically prioritizes your tasks into:\n• **Critical** — overdue or due within a week\n• **This Week** — coming up soon\n• **Coming Up** — future tasks\n\nPriority is category-aware: recommendation letters need 4+ weeks lead time, essays need 3 weeks.\n\n**School Research Cards**: Expand any school to see programs, notable features, campus culture, and links to their supplemental prompts.\n\nAll data persists in your browser via localStorage.",
  },
  /* ─── Study Pods ─── */
  {
    keywords: ['pod', 'pods', 'study pod', 'group', 'chat', 'collaborate', 'team', 'peer', 'invite', 'code'],
    question: 'How do Study Pods work?',
    answer: "Study Pods are **private group chats** for collaborating with peers on college apps.\n\n**Creating a pod**: Click **\"+ Create\"** in the Pods sidebar. Give it a name and optional description. You'll get a unique **invite code** to share.\n\n**Joining a pod**: Click **\"Join\"** and enter the invite code from a friend.\n\n**In a pod** you can:\n• Send messages in real-time (auto-refreshes every 8 seconds)\n• Share essay drafts for peer review\n• See member list and roles (Admin/Member)\n• Copy the invite code to add more friends\n\nMessages are grouped by sender (Discord-style) with date separators and timestamps. Each member gets a unique color-coded avatar.\n\nPro tip: Create separate pods for different friend groups — one for essay review, one for school strategy, etc.",
  },
  /* ─── Dark Mode ─── */
  {
    keywords: ['dark', 'dark mode', 'light mode', 'theme', 'night', 'appearance', 'toggle'],
    question: 'How do I enable dark mode?',
    answer: "You can toggle dark mode in **three places**:\n\n• **Header bar** — the moon/sun icon in the top-right corner\n• **Desktop sidebar** — \"Dark Mode\" / \"Light Mode\" button\n• **Mobile menu** — open the hamburger menu (☰) and tap the toggle\n\nYour preference is **saved automatically** and persists across sessions. If you haven't manually set a preference, it follows your **system/OS setting**.\n\nDark mode uses a deep navy palette that's easy on the eyes during late-night essay writing sessions.",
  },
  /* ─── SAT ─── */
  {
    keywords: ['sat', 'test', 'math', 'reading', 'writing', 'score', '1400', '1500'],
    question: 'What SAT scores should I aim for?',
    answer: "The SAT has two sections: **Math (200–800)** and **Reading & Writing (200–800)**, for a total of 400–1600.\n\nTarget scores by school tier:\n• **Top 20 / Ivy League**: 1500+\n• **Top 50**: 1400+\n• **Top 100**: 1300+\n\nYour **Profile** page scatterplot shows competitive zones with real school data. The holistic evaluation weighs SAT at **30%** of your overall score.",
  },
  /* ─── Extracurriculars ─── */
  {
    keywords: ['extracurricular', 'activity', 'club', 'volunteer', 'sport', 'ec', 'leadership'],
    question: 'How important are extracurriculars?',
    answer: "Extremely important — they're **35% of your holistic score** on AdmitsOnly, reflecting their real weight in admissions.\n\nThe AI evaluates your activities on:\n• **Leadership** — officer positions, founding roles\n• **Depth** — years of commitment, hours per week\n• **Breadth** — variety of categories\n• **Impact** — measurable results, awards, recognition\n\nAdd activities on the **Profile** page. The AI also connects your extracurriculars to your essays — the **Prompt-Aware EC Suggestion Engine** in the Essays section identifies which activities you should mention in which essay prompts.\n\nPro tip: Focus on **depth over breadth** — admissions officers prefer 2-3 deep commitments over 10 surface-level activities.",
  },
  /* ─── Motifs ─── */
  {
    keywords: ['motif', 'motifs', 'theme', 'narrative', 'board', 'connection', 'story'],
    question: 'What is the Motifs feature?',
    answer: "**Motifs** (in **Essays → Motifs** tab) discovers hidden thematic connections across your essays.\n\nThe **Motif Board** analyzes your essay content and identifies recurring themes — like resilience, creativity, community, intellectual curiosity — then maps which essays share those themes.\n\nThis helps you:\n• Build a **cohesive application narrative** where each essay reinforces your identity\n• Identify **gaps** — themes you haven't covered yet\n• Avoid **redundancy** — making sure different essays highlight different dimensions\n\nYou can save boards, toggle between board and narrative views, and use the insights to plan your remaining supplemental essays.",
  },
  /* ─── Pricing ─── */
  {
    keywords: ['plan', 'pricing', 'cost', 'subscribe', 'pay', 'billing', 'price', 'money'],
    question: 'What plans are available?',
    answer: "We offer three plans:\n\n• **Foundations for Growth** ($299/mo) — grades 5–8, academic foundation building\n• **Scholarship-Ready Academy** ($499/mo) — grades 9–12, full admissions strategy\n• **STEM Innovators Lab** ($449/mo) — STEM-focused students, specialized prep\n\nVisit the **Pricing** page for full details. You can upgrade or change plans anytime from the **Billing** section in the sidebar.",
  },
  /* ─── Sample Essays ─── */
  {
    keywords: ['sample', 'example', 'benchmark', 'good essay', 'strong essay', 'model', 'reference'],
    question: 'Are there sample essays I can learn from?',
    answer: "Yes! AdmitsOnly has a **Sample Essays Database** with 16 benchmark essays across all major prompt types.\n\nEach sample includes:\n• The full essay text written in authentic student voice\n• A **7-dimension scoring rubric** (authenticity, storytelling, self-reflection, specificity, prompt alignment, writing quality, overall)\n• **Admissions officer commentary** explaining what works\n• Specific **strengths** and **areas for improvement**\n• Quality tier: Exceptional, Strong, Good, or Needs Work\n\nThe database includes both **gold-standard essays** (to learn what great looks like) and **weaker examples** (to understand common mistakes like generic language, clichés, and lack of specificity).\n\nUse these as calibration references when writing your own essays.",
  },
  /* ─── Schools Database ─── */
  {
    keywords: ['school', 'university', 'college', 'how many', 'database', 'list', 'stanford', 'harvard', 'mit', 'yale'],
    question: 'Which schools are in the database?',
    answer: "The database includes **40 top schools** with real supplemental prompts, deadlines, and research data:\n\n**Ivy League**: Harvard, Yale, Princeton, Penn, Columbia, Brown, Dartmouth, Cornell\n\n**Top Private**: Stanford, MIT, Caltech, UChicago, Duke, Northwestern, Johns Hopkins, Rice, Vanderbilt, Notre Dame, WashU, Emory, Georgetown, Tufts\n\n**Top Public**: UC Berkeley, UCLA, Michigan, UVA, UNC, Georgia Tech, UT Austin, Wisconsin, Purdue, UF, Virginia Tech, Northeastern\n\n**Liberal Arts**: Williams, Amherst\n\n**Other**: NYU, USC, Boston College, CMU\n\nEach school has real prompts, acceptance rates, SAT ranges, GPA data, multiple deadline types, research data, and essay tips.",
  },
  /* ─── Contact & Support ─── */
  {
    keywords: ['contact', 'help', 'support', 'email', 'question', 'issue', 'bug', 'problem'],
    question: 'How can I get more help?',
    answer: "For help:\n\n• **This chatbot** — ask about any feature and I'll guide you\n• **Email**: support@admitsonly.com\n• **Contact page**: visit the Contact page on the website\n• **Study Pods**: ask your peers for advice\n\nOur team typically responds within 24 hours.",
  },
  /* ─── Parent access ─── */
  {
    keywords: ['parent', 'family', 'guardian', 'mom', 'dad'],
    question: 'Can parents access the dashboard?',
    answer: "Yes! Parents/guardians with a parent account can view their student's progress, essays, and application status. Create a parent account during registration to link it to your student's profile. Parents receive weekly summary reports by email.",
  },
  /* ─── Tips ─── */
  {
    keywords: ['tip', 'tips', 'advice', 'strategy', 'best', 'recommend', 'suggestion'],
    question: 'What are your top admissions tips?',
    answer: "Here are the top strategies built into AdmitsOnly:\n\n**1. Write for reuse** — Write one strong essay per prompt type, then use the Reuse Engine to adapt it across schools.\n\n**2. Start with \"Why Us\"** — These are the hardest to reuse, so write them fresh for each school. Use the Research Cards for school-specific details.\n\n**3. Track everything** — Add all your schools to the Application Tracker. The Smart Planner catches deadlines you'd miss.\n\n**4. Peer review** — Create a Study Pod and swap essays with 2-3 trusted friends. Outside perspective catches blind spots.\n\n**5. Find your motifs** — Use the Motifs tab to make sure your essays tell a cohesive story rather than repeating the same theme.\n\n**6. Be specific** — Our sample essays show that specificity (named people, exact numbers, concrete scenes) is the #1 differentiator between good and great essays.",
  },
  /* ─── Flywheel / How features connect ─── */
  {
    keywords: ['connect', 'flywheel', 'ecosystem', 'integration', 'together', 'feature', 'flow'],
    question: 'How do the features work together?',
    answer: "AdmitsOnly is built as a **flywheel** where each feature powers the others:\n\n**School List** (Applications) → populates your **Prompt Database** with relevant essays to write\n\n**Prompts** → one-click **Start Writing** creates a pre-filled essay draft\n\n**Essays** → feed into the **Reuse Engine** which finds adaptation opportunities across schools\n\n**Essays** → also power the **Motif Board** which finds thematic connections\n\n**Smart Planner** → uses your school list + deadline types to auto-prioritize tasks\n\n**School Research Cards** → provide \"Why Us\" content directly inside the prompt modal\n\nThe more you use, the smarter it gets. Start by adding your schools, then let the system guide your essay writing strategy.",
  },
];

/* ─── Answer matching with multi-signal scoring ─── */
function findAnswer(input: string): string {
  const lower = input.toLowerCase();
  let bestMatch: QA | null = null;
  let bestScore = 0;

  for (const qa of knowledgeBase) {
    let matchScore = 0;
    for (const keyword of qa.keywords) {
      if (lower.includes(keyword)) {
        // Longer keywords are more specific = higher weight
        matchScore += keyword.length > 6 ? 2 : 1;
      }
    }
    // Bonus for exact question match
    if (lower.includes(qa.question.toLowerCase().slice(0, 20))) {
      matchScore += 3;
    }
    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestMatch = qa;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.answer;
  }

  return "I'm not sure about that one! Try asking about:\n\n• **Getting started** with AdmitsOnly\n• **Essays**, **prompts**, or the **reuse engine**\n• **Applications** and deadline tracking\n• **Study Pods** for peer collaboration\n• **Profile scoring** and SAT/GPA targets\n• **Dark mode** and navigation\n• **Sample essays** and admissions tips\n\nOr email **support@admitsonly.com** for personalized help!";
}

/* ──────────────────────── SUGGESTED QUESTIONS ──────────────────────── */

const suggestedQuestions = [
  'How do I get started?',
  'How do the features work together?',
  'How do supplemental prompts work?',
  'What are your top admissions tips?',
  'How does the Reuse Engine work?',
  'How do I enable dark mode?',
];

/* ──────────────────────── MARKDOWN-LITE RENDERER ──────────────────────── */

function renderMarkdown(text: string) {
  return text.split('\n').map((line, li) => {
    if (line.trim() === '') return <br key={li} />;

    const parts = line.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold text-primary">{part}</strong> : <span key={i}>{part}</span>
    );

    // Handle bullet points
    if (line.trimStart().startsWith('•') || line.trimStart().startsWith('-')) {
      return <p key={li} className="ml-2 my-0.5">{parts}</p>;
    }

    return <p key={li} className="my-0.5">{parts}</p>;
  });
}

/* ──────────────────────── COMPONENT ──────────────────────── */

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

export default function HelpChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: "Hi! I'm your AdmitsOnly assistant. Ask me anything about essays, prompts, the reuse engine, application tracking, study pods, or admissions strategy!",
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text: msg };
    const answer = findAnswer(msg);
    const botMsg: Message = { id: `b_${Date.now()}`, role: 'bot', text: answer };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-12 h-12 lg:w-14 lg:h-14 rounded-2xl shadow-sm flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          open ? 'bg-slate-200 text-slate-700 rotate-0' : 'bg-accent'
        }`}
      >
        {open ? (
          <svg className="w-5 h-5 lg:w-6 lg:h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[5.5rem] lg:bottom-24 right-2 lg:right-6 z-50 w-[calc(100vw-1rem)] sm:w-[400px] max-h-[70vh] lg:max-h-[560px] bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-accent text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">AdmitsOnly Assistant</p>
                <p className="text-[11px] text-white/70">I know everything about the platform</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]" style={{ WebkitOverflowScrolling: 'touch' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-700 rounded-bl-md'
                }`}>
                  {msg.role === 'bot' ? renderMarkdown(msg.text) : msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />

            {/* Suggested questions */}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Popular questions:</p>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="block w-full text-left px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-accent/30 hover:bg-accent/5 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about any feature..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="px-4 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
