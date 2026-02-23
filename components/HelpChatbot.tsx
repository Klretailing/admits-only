import { useState, useRef, useEffect } from 'react';

/* ──────────────────────── KNOWLEDGE BASE ──────────────────────── */

interface QA {
  keywords: string[];
  question: string;
  answer: string;
}

const knowledgeBase: QA[] = [
  {
    keywords: ['get started', 'start', 'begin', 'new', 'first'],
    question: 'How do I get started?',
    answer: 'Welcome! Start by visiting your **Profile** page to enter your GPA, SAT scores, and extracurriculars. This will give you a holistic evaluation score. Then check out **Sessions** to book your first coaching session, and **Essays** to begin working on your college essays.',
  },
  {
    keywords: ['profile', 'score', 'evaluation', 'gpa', 'sat', 'ranking', 'percentile'],
    question: 'How does the profile scorer work?',
    answer: 'Your holistic score is calculated from three components: **GPA (35%)**, **SAT scores (30%)**, and **Extracurriculars (35%)**. The AI evaluates your activities for leadership, depth, breadth, and impact. Your percentile ranking compares you against all students on the platform. The scatterplot shows where you fall in GPA vs. SAT space with color-coded competitiveness zones.',
  },
  {
    keywords: ['essay', 'write', 'personal statement', 'supplement', 'draft'],
    question: 'How do I work on my essays?',
    answer: 'Go to the **Essays** section in your dashboard. Click **"New Essay"** to start a new piece. You can track drafts, see your coach\'s feedback, and view scores out of 10. Our coaches typically review essays within 48 hours. Each essay goes through multiple rounds: brainstorm, outline, draft, revision, and final polish.',
  },
  {
    keywords: ['session', 'coaching', 'meeting', 'schedule', 'book', 'coach'],
    question: 'How do I schedule a coaching session?',
    answer: 'Visit the **Sessions** page to see your upcoming and past sessions. Your assigned coach will schedule regular sessions based on your plan. If you need to reschedule, contact your coach directly or reach out to support. Sessions are available as 1:1 coaching, essay review, or group cohort formats.',
  },
  {
    keywords: ['progress', 'track', 'milestone', 'improvement'],
    question: 'How can I track my progress?',
    answer: 'The **Progress** page shows your milestones across four tracks: SAT/ACT Prep, Essay Portfolio, School Research, and Extracurricular Profile. Each track has clear milestones that your coach will mark as you advance. Your **Overview** dashboard also shows key stats at a glance.',
  },
  {
    keywords: ['plan', 'pricing', 'cost', 'subscribe', 'pay', 'billing'],
    question: 'What plans are available?',
    answer: 'We offer three plans: **Foundations for Growth** ($299/mo) for grades 5–8, **Scholarship-Ready Academy** ($499/mo) for grades 9–12 with full admissions strategy, and **STEM Innovators Lab** ($449/mo) for STEM-focused students. Visit the **Pricing** page for full details. You can upgrade or change plans anytime.',
  },
  {
    keywords: ['sat', 'score', 'test', 'math', 'reading', 'writing'],
    question: 'What SAT scores should I aim for?',
    answer: 'The SAT has two sections: **Math (200–800)** and **Reading & Writing (200–800)**, for a total of 400–1600. For top-50 universities, aim for **1400+**. For Ivy League and top-20, aim for **1500+**. Your profile page scatterplot shows the competitive zones. Our coaches provide targeted prep to maximize your score improvement — our average student improves by **+127 points**.',
  },
  {
    keywords: ['extracurricular', 'activity', 'club', 'volunteer', 'sport'],
    question: 'How important are extracurriculars?',
    answer: 'Very important! Top universities use **holistic review**, meaning extracurriculars can make or break your application. Focus on **depth over breadth** — leadership roles, long-term commitment, and measurable impact matter more than a long list of activities. Add your activities on the **Profile** page for an AI assessment.',
  },
  {
    keywords: ['contact', 'help', 'support', 'email', 'question'],
    question: 'How can I get more help?',
    answer: 'For technical support, email **support@admitsonly.com**. For academic questions, ask your assigned coach during your next session. You can also visit the **Contact** page on our website or call during business hours. Our team typically responds within 24 hours.',
  },
  {
    keywords: ['parent', 'family', 'guardian'],
    question: 'Can parents access the dashboard?',
    answer: 'Yes! Parents/guardians with a parent account can view their student\'s progress, upcoming sessions, and essay status. Create a parent account during registration and it will be linked to your student\'s profile. Parents receive weekly summary reports by email.',
  },
  {
    keywords: ['deadline', 'application', 'due', 'date', 'when'],
    question: 'How do I track application deadlines?',
    answer: 'Your coach will help you build a timeline based on your target schools. Key deadlines to know: **Early Decision** is typically November 1, **Early Action** is November 1–15, and **Regular Decision** is January 1–15. We send deadline alerts as dates approach.',
  },
  {
    keywords: ['navigate', 'find', 'where', 'page', 'menu', 'dashboard'],
    question: 'How do I navigate the dashboard?',
    answer: 'Use the **sidebar** on the left to navigate between sections: **Overview** (your main dashboard), **Profile** (enter stats & get scored), **Progress** (milestone tracking), **Sessions** (coaching schedule), and **Essays** (essay workspace). On mobile, tap the menu icon at the top.',
  },
];

function findAnswer(input: string): string {
  const lower = input.toLowerCase();
  let bestMatch: QA | null = null;
  let bestScore = 0;

  for (const qa of knowledgeBase) {
    const matchCount = qa.keywords.filter((k) => lower.includes(k)).length;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = qa;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.answer;
  }

  return "I'm not sure about that one. Try asking about your **profile score**, **essays**, **sessions**, **progress**, **SAT prep**, **extracurriculars**, or **pricing**. You can also email **support@admitsonly.com** for personalized help!";
}

/* ──────────────────────── SUGGESTED QUESTIONS ──────────────────────── */

const suggestedQuestions = [
  'How do I get started?',
  'How does the profile scorer work?',
  'How do I navigate the dashboard?',
  'What SAT scores should I aim for?',
];

/* ──────────────────────── MARKDOWN-LITE RENDERER ──────────────────────── */

function renderMarkdown(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-primary">{part}</strong> : <span key={i}>{part}</span>
  );
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
      text: "Hi! I'm your AdmitsOnly assistant. Ask me anything about your dashboard, profile scoring, essays, sessions, or admissions strategy!",
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
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          open ? 'bg-slate-700 rotate-0' : 'bg-gradient-to-br from-accent to-purple-600 shadow-accent/30'
        }`}
      >
        {open ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-accent to-purple-600 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold">AdmitsOnly Assistant</p>
                <p className="text-[11px] text-white/70">Ask me anything about the platform</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-md'
                    : 'bg-slate-100 text-slate-700 rounded-bl-md'
                }`}>
                  {msg.role === 'bot' ? renderMarkdown(msg.text) : msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />

            {/* Suggested questions (only if just the welcome message) */}
            {messages.length === 1 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Try asking:</p>
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
                placeholder="Type a question..."
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
