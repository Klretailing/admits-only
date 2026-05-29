# AdmitsOnly Platform — Complete Feature & Capability Reference

A comprehensive college admissions platform built with Next.js, TypeScript, Tailwind CSS, PostgreSQL (Prisma), and NextAuth. Four user roles — Student, Parent, Educator, Admin — each with a dedicated dashboard, navigation, and feature set.

---

## Table of Contents

1. [Public Website](#1-public-website)
2. [Authentication & Roles](#2-authentication--roles)
3. [Student Dashboard](#3-student-dashboard)
4. [Parent Dashboard](#4-parent-dashboard)
5. [Educator Dashboard](#5-educator-dashboard)
6. [Admin Portal](#6-admin-portal)
7. [AI & Scoring Engines](#7-ai--scoring-engines)
8. [Data & Infrastructure](#8-data--infrastructure)
9. [Cross-Cutting UX](#9-cross-cutting-ux)

---

## 1. Public Website

### Landing Page (`/`)
- Animated hero section with university ticker (22 top schools)
- Pain-point comparison cards (scattered apps vs. one platform, unknown standing vs. real percentile, applying alone vs. community)
- Tool showcase grid highlighting all platform capabilities
- Animated statistics counters (users served, essays scored, etc.)
- University logo bar and call-to-action sections

### Services Page (`/services`)
- Detailed breakdown of all consulting service offerings
- Three-step customer journey (Initial Conversation, Personalized Plan, Ongoing Support)
- Interactive service showcase component with animated reveals
- Testimonial carousel with real family feedback
- Statistics section (family retention rate, years of coaching, states served)

### Consulting Page (`/consulting`)
- Dedicated consulting landing page mirroring the services flow
- Service showcase and testimonial integration

### About Page (`/about`)
- Company history timeline (2012-2025 milestones)
- Core values (Student-Centered Design, Family Partnership, Excellence, Measurable Outcomes)
- Key statistics (98% retention, 12+ years, 15+ states, 500+ families)

### FAQ Page (`/faq`)
- Frequently asked questions about the platform and services

### Contact Page (`/contact`)
- Contact form (name, email, phone, message)
- Submissions stored in database and viewable by admins

---

## 2. Authentication & Roles

### Registration (`/auth/register`)
- Email + password registration
- Password minimum: 8 characters
- Role auto-assigned as `student` by default
- Generates unique user ID

### Login (`/auth/login`)
- NextAuth CredentialsProvider with JWT strategy
- Email/password authentication
- Role-based redirect after login (student to `/dashboard`, parent to `/parent`, educator to `/educator`, admin to `/admin`)

### Role System
| Role | Dashboard | Description |
|------|-----------|-------------|
| `student` | `/dashboard` | Primary users — write essays, track applications, get scored |
| `parent` | `/parent` | Connected to a student via connection code, read-only progress view |
| `educator` | `/educator` | Tutors/coaches — manage students, sessions, earnings, essay reviews |
| `admin` | `/admin` | Platform administrators — analytics, user management, settings |

### Connection Code System
- Students get a unique 8-character code (format: `XXXX-XXXX`, avoids I/O/0/1 for clarity)
- Parents and tutors enter a student's code to connect
- Two roles when connecting: `parent` (sees financial estimates + full progress) or `tutor` (sees essays for review + session history)
- Connections are bidirectional with role-based visibility
- Both parties can remove a connection

---

## 3. Student Dashboard

### 3.1 Overview / Home (`/dashboard`)
- **Welcome header** with personalized greeting
- **Smart Nudges Banner** — up to 3 contextual nudges based on profile state:
  - Missing profile, no essays, no applications, stale drafts (>7 days untouched), profile recently updated, upcoming deadlines (<14 days), high readiness (>=80%), high-scoring essay (>=85)
  - Type-based styling: info (blue), warning (amber), success (green)
  - Individually dismissible
- **Stat cards** — quick metrics (essays written, applications tracked, pod count, holistic score)
- **Application Readiness Ring** — SVG circular progress indicator (0-100%) with animated stroke
- **Getting Started Checklist** — 6 weighted items:
  - Complete your profile (25%)
  - Write your first essay (20%)
  - Add target schools (20%)
  - Get essay feedback (15%)
  - Join a study pod (10%)
  - Explore college matches (10%)

### 3.2 My Profile (`/dashboard/profile`)
- **Academic Stats Input**:
  - GPA (unweighted, 4.0 scale) — primary for matching
  - GPA Weighted (5.0 scale) — separate field with rigor bonus
  - SAT scores (Math + Reading/Writing, separate inputs)
  - ACT score — with ACT-to-SAT concordance table for best-score matching
- **Extracurricular Activities Manager**:
  - Add unlimited ECs with: name, role, description, years, hours/week, category
  - 7 activity categories: Internship, Volunteering, Sport, Education Programs, Recreational, Research, Clubs
  - Each category has its own color-coded bucket with gradient styling
  - **EC Description Revision Engine** — analyzes descriptions for strong verbs, filler words, quantification, and impact language; provides real-time writing tips
  - AI-powered evaluation of leadership depth, breadth, and impact
- **Holistic Score Display**:
  - Overall score (0-100) with percentile ranking
  - Component breakdown: GPA Score (33%), Test Scores (28%), Extracurriculars (34%), plus rigor bonus (up to 5 points)
  - Visual scatterplot showing student position against competitive zones
  - Comparative data against platform users
- **Auto-save** — profile changes save automatically

### 3.3 Essays (`/dashboard/essays`)
This is the largest feature (~3500+ lines). It contains multiple sub-systems:

#### Essay Editor
- Rich text editing with auto-save (1.2s debounce)
- Real-time word count and character tracking
- Essay status tracking: Not Started, Draft, In Review, Complete
- Mobile-responsive with dedicated mobile editor view

#### AI Essay Analysis
- **Overall Score** (0-100) combining multiple dimensions
- **AI Detection Score** — flags content that reads as AI-generated
- **Vocabulary Score** — evaluates word choice sophistication
- **Grammar Score** — checks grammar and mechanics
- **Originality Score** — measures uniqueness and authenticity

#### Sentence-Level Analysis
- Individual sentence scoring and annotation
- Sentence type classification
- Stats dashboard with readability metrics

#### Grammar Checker
- Real-time grammar issue detection
- One-click fix application
- Issue dismissal for false positives

#### Live Writing Tips
- Context-aware suggestions based on essay content and prompt
- Integrated with extracurricular data for personalization

#### Supplemental Prompt Hub
- Browse supplemental essay prompts for 50+ schools
- 11 canonical prompt types: Why Us, Community, Intellectual, Activity, Identity, Challenge, Creative, Future, Diversity, Roommate, Other
- Filter by school and prompt type
- Click-to-start writing from any prompt

#### Essay Reuse Engine
- Analyzes existing essays for reuse across supplemental prompts
- Match scoring based on thematic overlap
- Reduces redundant writing effort

#### Submit for Review
- Submit essays to connected educators for feedback
- Review note/message attachment
- Status tracking (pending, reviewed)

#### Essay Delete
- Confirmation dialog before deletion (inline confirm/cancel)

### 3.4 Applications Tracker (`/dashboard/progress`)
- **Add/manage college applications** with:
  - School name (autocomplete from 50+ school database)
  - Deadline date
  - Application type: EA, ED, ED2, RD, REA, Rolling
  - Status: Not Started, In Progress, Submitted, Accepted, Rejected, Waitlisted, Deferred
  - Notes field
- **Per-application task checklist** (8 default tasks):
  - Common App filled, Main essay finalized, Supplemental essays done, Rec letters requested, Test scores sent, Transcript requested, Financial aid/CSS Profile, Application fee paid
- **Smart Timeline Generator** — auto-generates a timeline based on deadlines
- **Weekly Digest** — summary of upcoming tasks and deadlines
- **School Research Cards** — pulls data from the school database (acceptance rate, SAT range, GPA, strengths)
- Data persisted to database via `/api/applications`

### 3.5 Study Pods (`/dashboard/pods`)
Collaborative study group system (~2800 lines):

#### Pod Management
- Create pods with name and description
- Join pods via invite code
- Leave pods (with confirmation dialog)
- View pod members list

#### Real-Time Chat
- Group messaging within pods
- Message reactions (emoji picker)
- Reply-to-message threading
- Message hover actions

#### Document Collaboration Hub
- Upload documents (drag-and-drop support with visual overlay)
- Document viewing with zoom controls
- Inline commenting on documents
- Text selection commenting
- Reply threads on comments
- Upload progress indicator

#### Focus Sessions
- Timed study sessions with goals
- Session timer display
- Goal tracking

#### Leaderboard & Gamification
- Member stats tracking (messages, focus time, documents)
- XP system with leaderboard rankings
- Achievement badges/definitions

#### Polls
- Create polls with custom questions and options
- Multi-option voting
- Results display

#### Activity Feed
- Pod activity stream showing recent actions

### 3.6 College Admissions Map (`/dashboard/college-heatmap`)
- **Interactive heatmap/radar visualization** of 170 colleges
- **Fit scoring** based on student's GPA and SAT:
  - Overall fit (0-100)
  - GPA fit component
  - SAT fit component
  - Selectivity penalty for ultra-competitive schools (<10% acceptance)
- **Tier classification**: Safety, Match, Reach
- **Color-coded temperature visualization** (blue=safety through red=reach)
- **School detail cards** with acceptance rate, SAT range, GPA, strengths, size, type
- **Save/unsave colleges** to personal list
- Filters by tier, school type, size, state

### 3.7 College Match (`/dashboard/college-match`)
- Dedicated matching page for finding best-fit colleges

### 3.8 Career Roadmap (`/dashboard/career-roadmap`)
- **Major Picker** — browse available majors with visual cards
- **Career Interest Quiz** — multi-step quiz that scores aptitude across categories
- **Quiz Results** — ranked career path recommendations
- **Career Path Roadmaps** — for each major:
  - Career paths with salary ranges
  - Milestone timeline (education, early career, advancement)
  - Recommended colleges for each major
- **Major Comparison** — side-by-side comparison of two majors

### 3.9 Essay Library (`/dashboard/essay-library`)
- Browse successful essay examples from other students
- Filter/search essays by college, prompt type
- Each essay shows: title, college, prompt, student stats (GPA, SAT, state, ECs, awards)
- Free vs. premium essay access (price in cents)
- View full essay content

### 3.10 Sessions (`/dashboard/sessions`)
- View upcoming coaching sessions with educator
- Session details: title, educator name, date/time, duration, platform, amount, payment status
- **Join button** for sessions with meeting links (Zoom/Google Meet)
- Platform indicator: online link or "In Person"
- Relative date formatting (Today, Tomorrow, Yesterday, Last [Day])
- Sections: Upcoming (with live pulse dot), Completed, Cancelled
- Empty state with guidance on connecting via connection code

### 3.11 Settings (`/dashboard/settings`)
- **Connection Code Display** — shows student's unique 8-character code with copy button
- **Connected People** — lists parents and tutors connected to the student
  - Shows connection role (Parent/Tutor) and connection date
  - Inline remove confirmation
- **Account Info** — read-only display of name, email, role
- **Privacy & Sharing** — explains what parents vs. tutors can see

---

## 4. Parent Dashboard

### 4.1 Overview (`/parent`)
- Student connection status check
- Student overview: name, profile stats, essay counts, application progress
- Quick links to all parent features

### 4.2 Application Progress (`/parent/progress`)
- Read-only view of connected student's application list
- Status tracking per school
- Deadline visibility

### 4.3 Action Items (`/parent/action-items`)
- **Smart task generation** from student's applications:
  - General tasks: Complete FAFSA, discuss preferences, review aid letters, create visit schedule
  - Per-school tasks: Submit CSS Profile, schedule campus visit
  - Summary tasks: Compare net costs, discuss safety/match/reach balance
- **Database-persisted** tasks (migrated from localStorage)
- Toggle task completion, add custom tasks, remove tasks
- Categorized: Financial Aid (green), Campus Visit (blue), Discussion (purple), Custom (gray)
- Sections: Urgent (due within 14 days), This Month, Coming Up, Completed
- Progress ring showing completion percentage

### 4.4 Financial Planning (`/parent/financial`)
- Cost estimation and financial aid information
- Connected to student's school list

### 4.5 College Comparison (`/parent/compare`)
- Side-by-side comparison of colleges on student's list
- Compare metrics: acceptance rate, SAT range, GPA, cost, strengths

### 4.6 Calendar (`/parent/calendar`)
- Deadline calendar view for student's applications
- Visual timeline of upcoming dates

### 4.7 Settings (`/parent/settings`)
- **Own Connection Code** — display and copy
- **Connect to Student** — enter student's code as parent or tutor role
- **Active Connections** — view and manage connections
  - Shows connected students with role and connection date
  - Remove connections

---

## 5. Educator Dashboard

### 5.1 Overview (`/educator`)
- Dashboard with key metrics: total students, active sessions, revenue
- Quick access to all educator features

### 5.2 My Students (`/educator/students`)
- List of connected students (via `educator_students` table and connection codes)
- Student connection code input for adding new students
- Per-student: name, email, essay count, join date
- Click to view individual student details

### 5.3 Student Progress (`/educator/student-progress`)
- Detailed view of a specific student's progress
- Essay status breakdown, application tracking
- Student notes per student

### 5.4 Essay Reviews (`/educator/essay-reviews`)
- Queue of essays submitted for review by students
- Review workflow: receive submission, read essay, provide feedback
- Review status tracking

### 5.5 Schedule (`/educator/schedule`)
- Session scheduling and management
- Booking system for tutoring sessions
- Platform selection (Zoom, Google Meet, in-person)
- Session status: scheduled, completed, cancelled, no-show

### 5.6 Earnings (`/educator/earnings`)
- **Revenue Dashboard**:
  - Total revenue, monthly revenue, paid/unpaid amounts
  - Total sessions, completed sessions, total hours, average hourly rate
- **Interactive Bar Chart**:
  - Monthly earnings and cumulative views
  - Customizable date range: 3m, 6m, 1y, all, custom range
  - Hover tooltips with exact amounts
- **Revenue by Student Breakdown**:
  - Per-student earnings with paid/unpaid split
  - Session count per student
  - Horizontal bar visualization
- **Manual Earnings Entry**:
  - Add custom earnings (description, hours, amount, date)
  - Delete with confirmation dialog
- **Payment History**:
  - Filter: All, Paid, Unpaid
  - Per-session payment details

### 5.7 Services (`/educator/services`)
- Create and manage service offerings
- Service attributes: name, description, duration, price, currency, type (one-on-one, group, etc.)
- CRUD operations via API

### 5.8 Session Notes (`/educator/session-notes`)
- **Notion-like notepad** for session documentation
- Create notes with title, content, color coding
- Pin/unpin important notes
- Archive old notes
- Sort order management

### 5.9 Settings (`/educator/settings`)
- **Profile Management**:
  - Headline and bio
  - Hourly rate and timezone
  - Credentials (JSON array)
  - Subjects/specialties (JSON array)
- **Meeting Links**: Zoom link, Google Meet link
- **Connection Code**: display and copy
- **Active Connections**: view connected students

---

## 6. Admin Portal

### 6.1 Dashboard (`/admin`)
- **Platform Statistics**:
  - Total users, students, parents
  - Total essays, unread contact submissions
  - Revenue: MRR, total paid users, plan breakdown
  - Engagement: essays per user, pods per user, profile completion rate
- **User Growth Chart** — monthly new signups bar chart
- **Essay Growth Chart** — monthly essay creation bar chart
- **Recent Signups** — latest users with plan info
- **Study Pods Stats** — total pods, messages, members, messages per pod
- **Revenue by Plan** — Foundations ($299/mo), Scholarship-Ready ($499/mo), STEM Elite ($449/mo)

### 6.2 User Management (`/admin/users`)
- Full user list with search and role filter (All, Student, Parent)
- User details: name, email, role, join date, essay count
- User data from live database

### 6.3 Essay Management (`/admin/essays`)
- Essay review queue with status tabs (Needs Review, Scored, All)
- Essay details: title, student, prompt, status, score, draft count, submission date

### 6.4 Session Management (`/admin/sessions`)
- Overview of all tutoring sessions across the platform
- Tabs: Upcoming, Completed
- Session details: title, student, coach, date/time, type, status

### 6.5 Payments (`/admin/payments`)
- Revenue overview with MRR, ARR, avg revenue per user
- Plan subscriber counts and revenue breakdown
- Recent signup activity with plan info
- Engagement metrics

### 6.6 Analytics (`/admin/analytics`)
- **Overview Metrics**: total events, sessions, unique users, pageviews, clicks, feature events
- **Daily Visits Chart**: sessions and pageviews over time
- **Top Pages**: most visited routes
- **Feature Usage**: which features are used most and how
- **Navigation Sources & Targets**: where users navigate from and to
- **Duration Stats**: average, max, median session duration
- **Depth Stats**: average pageviews, clicks, features per session
- **Scroll Depth**: how far users scroll on each page
- **Device Breakdown**: mobile vs. desktop
- **Top Users**: most active users by sessions, pageviews, feature usage
- **Hourly Activity Heatmap**: activity by day of week and hour

### 6.7 Messages (`/admin/messages`)
- View all contact form submissions
- Mark submissions as read/unread
- Message detail view with full content

### 6.8 Essay Library Management (`/admin/essay-library`)
- Manage the curated essay library
- Add/edit/remove example essays

### 6.9 Demos (`/admin/demos`)
- Interactive demo/showcase page with animated reveal sections

### 6.10 Settings (`/admin/settings`)
- **General**: platform name, description, notifications, program settings
- **Programs**: manage program configurations
- **Access & Permissions**: user access controls
- **Integrations**: third-party service settings
- **Account**: admin account management
- Toggle-based setting controls

### 6.11 Mobile Navigation & View Switching
- **Hamburger menu** with slide-out sidebar (all 10 admin links)
- **Bottom tab bar** with 5 key pages (Home, Users, Essays, Analytics, Settings)
- **View switching** — admin can switch to see:
  - Student View (purple link)
  - Parent View (teal link)
  - Educator View (emerald link)

---

## 7. AI & Scoring Engines

### 7.1 Holistic Scoring Engine (`lib/scoring.ts`)
- **Component Weights**: GPA 33%, Test Scores 28%, Extracurriculars 34%
- **Rigor Bonus**: up to 5 points for weighted GPA on 5.0 scale
- **GPA Scoring**: maps 0.0-4.0 to a score component
- **Test Score Scoring**: uses best of SAT or ACT (via concordance table)
- **ACT-to-SAT Concordance**: full mapping table for cross-test comparison
- **EC Evaluation**: AI-powered analysis of leadership, depth, breadth, and impact
- **Percentile Ranking**: compares against all platform users
- **Comparative Data**: benchmark against platform averages

### 7.2 College Matching Engine (`lib/colleges.ts`, `lib/collegeMatch.ts`)
- **170 colleges** in database with: acceptance rate, avg GPA, SAT range (25th-75th), strengths, size, type, state
- **Fit Algorithm**: GPA fit (40%) + SAT fit (60%) with selectivity penalty
- **Tier Assignment**: Safety (>=0.25), Match (-0.25 to 0.25), Reach (<-0.25)
- **Temperature color mapping** for visual heatmap display

### 7.3 Essay AI Analysis (`pages/api/ai/essay-feedback.ts`)
- Multi-dimensional essay scoring
- AI detection analysis
- Vocabulary sophistication evaluation
- Grammar and mechanics checking
- Originality assessment

### 7.4 Sentence Analysis Engine (`lib/sentenceAnalysis.ts`)
- Per-sentence scoring and classification
- Readability metrics computation
- Sentence type detection

### 7.5 Grammar Checker (`lib/grammarCheck.ts`)
- Rule-based grammar issue detection
- Auto-fix suggestions
- Issue categorization

### 7.6 AI Chat & Agent (`pages/api/ai/chat.ts`, `pages/api/ai/agent.ts`)
- Conversational AI assistant
- Agent-based interactions with memory
- Conversation history stored in `agent_conversations` and `agent_messages` tables
- User preferences and facts stored in `agent_memories` table

### 7.7 School Data & Prompt Engine (`lib/schoolData.ts`)
- **50+ schools** with supplemental essay prompts
- **11 canonical prompt types** with metadata
- **Essay reuse matching** — finds thematic overlaps between essays and prompts
- **Smart timeline generation** from school deadlines
- **Weekly digest generation** for upcoming tasks

### 7.8 Career Roadmap Engine (`lib/careerRoadmaps.ts`)
- Major database with career paths and salary data
- Career interest quiz with scoring algorithm
- College recommendations per major
- Milestone timelines for career progression

### 7.9 Readiness Scoring (`pages/api/readiness.ts`)
- Weighted readiness score (0-100) based on 6 checklist items
- Smart nudge generation with 8 rules
- Contextual recommendations based on user state

---

## 8. Data & Infrastructure

### 8.1 Database Schema (`lib/db.ts`)
All tables are created via `ensureSchema()` on cold start:

| Table | Purpose |
|-------|---------|
| `users` | All users (id, name, email, password, role, plan, timestamps) |
| `student_profiles` | GPA, SAT, ACT, weighted GPA, extracurriculars (JSONB), holistic score, percentile |
| `essays` | Essays with title, prompt, content, status, AI scores, timestamps |
| `contact_submissions` | Contact form messages (name, email, phone, message, read status) |
| `analytics_events` | Client-side analytics (type, path, session, user, referrer, device, meta) |
| `study_pods` | Pods with name, description, invite code |
| `pod_members` | Pod membership (user, pod, role, join date) |
| `pod_messages` | Chat messages (pod, user, content, type, essay reference) |
| `motif_boards` | Essay motif brainstorming boards (bullets, analysis as JSONB) |
| `agent_conversations` | AI chat conversation threads |
| `agent_messages` | Individual AI chat messages (role, content) |
| `agent_memories` | AI user memory (facts, preferences as JSONB) |
| `educator_profiles` | Bio, headline, credentials, subjects, hourly rate, meeting links, timezone, availability |
| `educator_services` | Service offerings (name, description, duration, price, type) |
| `educator_students` | Educator-student relationships |
| `educator_student_notes` | Per-student notes from educators |
| `educator_bookings` | Session bookings (student, service, date, duration, status, platform, meeting link, amount, paid) |
| `educator_earnings` | Manual earnings entries (description, hours, amount, date) |
| `connection_codes` | Unique 8-char connection codes per user |
| `account_connections` | Parent/tutor-to-student connections (role-based) |
| `saved_applications` | Student application lists (saved as JSONB) |
| `essay_library_docs` | Curated essay examples for the library |
| `essay_reviews` | Essay review submissions and feedback |
| `tutor_session_notes` | Notion-like notepad for educators |
| `parent_action_items` | Parent task lists (label, category, school, done, due date) |
| `pod_documents` | Uploaded documents in study pods |
| `pod_document_comments` | Comments on pod documents |

### 8.2 Authentication (`lib/auth.ts`)
- NextAuth with CredentialsProvider
- JWT session strategy
- Password hashing with bcrypt
- Session includes user id, role, name, email

### 8.3 Analytics System (`lib/analytics.ts`)
- Client-side event tracking (pageviews, clicks, feature usage, navigation)
- Session-based analytics with device info
- Scroll depth tracking
- Server-side storage in `analytics_events` table
- Admin analytics dashboard for visualization

### 8.4 Theme System (`lib/themeContext.tsx`)
- Light/dark mode toggle
- Theme persisted across sessions
- Available in all layout components

### 8.5 Subscription Plans (`lib/plans.ts`)
| Plan | Audience | Price |
|------|----------|-------|
| Foundations for Growth | Grades 5-8 | $299/mo |
| Scholarship-Ready Academy | Grades 9-12 | $499/mo |
| STEM Innovators Lab | Grades 8-12 | $449/mo |

### 8.6 API Endpoints (37 total)
- **Auth**: register, NextAuth [...nextauth]
- **Student**: profile, essays, applications, pods, readiness, sessions, college-match, motifs, essay-library, analytics, dashboard, connection-code
- **AI**: chat, agent, essay-feedback
- **Educator**: overview, profile, students (CRUD + notes), services (CRUD), bookings (CRUD), earnings, essay-reviews, session-notes, student-progress
- **Parent**: overview, action-items (CRUD)
- **Admin**: stats, users, contacts, analytics, essay-library
- **Public**: contact, health
- **Pod**: pods, pod-documents, pod-engage, pod-sessions

---

## 9. Cross-Cutting UX

### 9.1 Help Chatbot (`components/HelpChatbot.tsx`)
- Floating help widget available on all student dashboard pages
- Knowledge base with keyword matching
- Covers: getting started, navigation, profile/scoring, essays, applications, study pods
- Contextual answers based on user questions

### 9.2 Responsive Design
- All four dashboards (Student, Parent, Educator, Admin) have full mobile support
- **Desktop**: persistent sidebar navigation
- **Mobile**: hamburger menu with slide-out sidebar + bottom tab bar
- Mobile-optimized layouts for complex features (essay editor, study pods, college heatmap)

### 9.3 Consistent Loading States
- Themed SVG spinners across all pages:
  - Student: accent/purple spinner
  - Educator: emerald spinner
  - Parent: teal spinner
- Consistent centered placement

### 9.4 Confirmation Dialogs
- Inline confirm/cancel for destructive actions:
  - Essay deletion
  - Pod leaving
  - Earnings deletion
  - Connection removal

### 9.5 Empty States
- Contextual empty states with actionable guidance:
  - Essays: explains what essays are for, CTA to create first essay
  - Sessions: guides to connection code setup
  - Pods: explains how to create or join
  - Applications: prompts to add target schools

### 9.6 Animation System (`hooks/useAnimations.ts`)
- `useInView` — intersection observer for scroll-triggered reveals
- `useCountUp` — animated number counters
- `useStaggerReveal` — sequential reveal animations for lists
- Used across landing pages and dashboard components

### 9.7 Dark Mode
- Toggle available in sidebar, header, and mobile menu
- Persisted theme preference
- Applied across all dashboard layouts
