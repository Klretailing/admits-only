/* ══════════════════════════════════════════════════════════════════════
   SCHOOL DATA — Prompt Database, Research Data, Categorization Engine
   ══════════════════════════════════════════════════════════════════════
   This is the shared foundation that powers:
   1. Supplemental Prompt Hub (essay workspace)
   2. Essay Reuse Engine (essay-to-prompt matching)
   3. School Research Cards (application tracker)
   4. Deadline Intelligence (smart planner)
   ══════════════════════════════════════════════════════════════════════ */

/* ─── CANONICAL PROMPT TYPES ─── */
export type PromptType =
  | 'why_us'           // Why do you want to attend this school?
  | 'community'        // How will you contribute to our community?
  | 'intellectual'     // Describe an intellectual interest / curiosity
  | 'activity'         // Tell us about a meaningful extracurricular
  | 'identity'         // What about your identity/background shapes you?
  | 'challenge'        // Describe a challenge you overcame
  | 'creative'         // Creative/open-ended prompt
  | 'future'           // What do you want to study/do and why?
  | 'diversity'        // How will you contribute to diversity?
  | 'roommate'         // Letter to your future roommate
  | 'other';           // Doesn't fit canonical types

export interface PromptTypeInfo {
  type: PromptType;
  label: string;
  description: string;
  color: string;       // Tailwind color class
  icon: string;        // emoji
  keywords: string[];  // for matching
}

export const PROMPT_TYPES: PromptTypeInfo[] = [
  {
    type: 'why_us',
    label: 'Why Us',
    description: 'Why this specific school, program, or community',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: '🏫',
    keywords: ['why', 'what about', 'interests you', 'drew you', 'appeal', 'attracted', 'choose', 'attend', 'specifically', 'campus'],
  },
  {
    type: 'community',
    label: 'Community',
    description: 'How you\'ll contribute to the campus community',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    icon: '🤝',
    keywords: ['community', 'contribute', 'bring', 'campus', 'perspective', 'environment', 'belonging', 'engage'],
  },
  {
    type: 'intellectual',
    label: 'Intellectual Curiosity',
    description: 'An academic interest, idea, or question that excites you',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: '💡',
    keywords: ['intellectual', 'curiosity', 'idea', 'topic', 'academic', 'fascinated', 'explore', 'question', 'think about', 'excites'],
  },
  {
    type: 'activity',
    label: 'Activity / EC',
    description: 'A meaningful extracurricular or activity',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    icon: '⚡',
    keywords: ['activity', 'extracurricular', 'meaningful', 'involvement', 'spend time', 'passion', 'outside classroom'],
  },
  {
    type: 'identity',
    label: 'Identity',
    description: 'Your background, identity, or what makes you you',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    icon: '🪞',
    keywords: ['identity', 'background', 'who you are', 'shaped', 'culture', 'heritage', 'experience', 'define'],
  },
  {
    type: 'challenge',
    label: 'Challenge',
    description: 'A setback, failure, or obstacle you overcame',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    icon: '🧗',
    keywords: ['challenge', 'setback', 'failure', 'obstacle', 'difficult', 'overcome', 'adversity', 'struggle', 'resilience'],
  },
  {
    type: 'creative',
    label: 'Creative / Open',
    description: 'Unconventional or creative prompt',
    color: 'bg-pink-50 text-pink-600 border-pink-200',
    icon: '🎨',
    keywords: ['creative', 'imagine', 'letter', 'playlist', 'describe', 'world', 'create', 'if you could'],
  },
  {
    type: 'future',
    label: 'Future / Goals',
    description: 'What you want to study, become, or achieve',
    color: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    icon: '🔭',
    keywords: ['future', 'goal', 'career', 'study', 'major', 'aspiration', 'plan', 'hope to', 'want to be', 'profession'],
  },
  {
    type: 'diversity',
    label: 'Diversity',
    description: 'How you\'ll contribute to or value diversity',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
    icon: '🌍',
    keywords: ['diversity', 'diverse', 'perspective', 'inclusive', 'different', 'multicultural', 'equity'],
  },
  {
    type: 'roommate',
    label: 'Roommate / Personal',
    description: 'Personal letter, fun facts, or get-to-know-you',
    color: 'bg-teal-50 text-teal-600 border-teal-200',
    icon: '✉️',
    keywords: ['roommate', 'letter', 'fun fact', 'know about you', 'introduce', 'five things', 'personal'],
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Doesn\'t fit standard categories',
    color: 'bg-slate-50 text-slate-600 border-slate-200',
    icon: '📝',
    keywords: [],
  },
];

/* ─── SUPPLEMENTAL PROMPTS ─── */

export interface SupplementalPrompt {
  id: string;
  text: string;
  type: PromptType;
  wordLimit: number;
  required: boolean;
}

export interface SchoolDeadlines {
  ea?: string;   // Early Action
  ed?: string;   // Early Decision
  ed2?: string;  // Early Decision II
  rd?: string;   // Regular Decision
  rolling?: boolean;
}

export interface SchoolResearch {
  uniquePrograms: string[];
  notableFeatures: string[];
  campusCulture: string[];
  recentNews: string[];
  studentLife: string[];
}

export interface SchoolData {
  id: string;
  name: string;
  location: string;
  acceptanceRate: string;
  avgSAT: string;
  avgGPA: string;
  deadlines: SchoolDeadlines;
  prompts: SupplementalPrompt[];
  research: SchoolResearch;
  essayTip: string;
}

/* ─── SCHOOL DATABASE ─── */

export const SCHOOLS: SchoolData[] = [
  {
    id: 'stanford',
    name: 'Stanford University',
    location: 'Stanford, CA',
    acceptanceRate: '3.7%',
    avgSAT: '1510-1570',
    avgGPA: '3.96',
    deadlines: { ea: 'Nov 1', rd: 'Jan 2' },
    prompts: [
      { id: 'stan-1', text: 'The Stanford community is deeply curious and driven to learn in and out of the classroom. Reflect on an idea or experience that makes you genuinely excited about learning.', type: 'intellectual', wordLimit: 250, required: true },
      { id: 'stan-2', text: 'Virtually all of Stanford\'s undergraduates live on campus. Write a note to your future roommate that reveals something about you or that will help your roommate — and us — get to know you better.', type: 'roommate', wordLimit: 250, required: true },
      { id: 'stan-3', text: 'Tell us about something that is meaningful to you, and why?', type: 'identity', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Symbolic Systems (interdisciplinary AI + cognitive science)', 'Stanford d.school (design thinking)', 'Stanford Humanities Center', 'Bio-X interdisciplinary biosciences', 'Knight-Hennessy Scholars'],
      notableFeatures: ['Quarter system (explore more courses)', 'Open-ended major declaration (not until end of sophomore year)', 'Cardinal Service community engagement', 'Stanford Research Computing Center'],
      campusCulture: ['Full Moon on the Quad tradition', 'Fountain hopping', 'Big Game rivalry with UC Berkeley', 'Entrepreneurial culture — Silicon Valley immersion'],
      recentNews: ['Stanford Doerr School of Sustainability launched', 'New Residential College system', 'Expanded financial aid — no tuition for families under $100k'],
      studentLife: ['700+ student organizations', 'Residential theme houses (e.g., Casa Italiana, Haus Mitteleuropa)', '36 varsity sports teams', 'Stanford Daily independent newspaper'],
    },
    essayTip: 'Stanford values intellectual vitality and authentic voice. Avoid generic "Silicon Valley" references — show specific curiosity.',
  },
  {
    id: 'mit',
    name: 'MIT',
    location: 'Cambridge, MA',
    acceptanceRate: '3.9%',
    avgSAT: '1520-1580',
    avgGPA: '3.97',
    deadlines: { ea: 'Nov 1', rd: 'Jan 4' },
    prompts: [
      { id: 'mit-1', text: 'How has the world you come from — including your opportunities, experiences, and challenges — shaped your dreams and aspirations?', type: 'identity', wordLimit: 250, required: true },
      { id: 'mit-2', text: 'Describe the world you come from; for example, your family, school, community, city, or town. How has that world shaped your dreams and aspirations?', type: 'community', wordLimit: 250, required: true },
      { id: 'mit-3', text: 'Tell us about a significant challenge you\'ve faced or something important that didn\'t go according to plan. How did you manage the situation?', type: 'challenge', wordLimit: 250, required: true },
      { id: 'mit-4', text: 'Tell us about something you do simply for the fun of it.', type: 'activity', wordLimit: 250, required: true },
      { id: 'mit-5', text: 'How did you manage a situation or challenge that didn\'t go as planned?', type: 'challenge', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['UROP (Undergraduate Research Opportunities Program — 85% of students participate)', 'MIT Media Lab', 'Integrated Design & Management', 'Computational Science & Engineering', 'D-Lab (Development through Dialogue, Design, and Dissemination)'],
      notableFeatures: ['Pass/No Record first semester (reduces pressure)', 'IAP (Independent Activities Period in January)', 'MIT OpenCourseWare', 'Maker culture — extensive fabrication labs'],
      campusCulture: ['Hack culture (creative, visible pranks)', 'MIT Mystery Hunt (annual puzzle competition)', 'Brass Rat (class ring tradition)', 'Tim the Beaver mascot'],
      recentNews: ['MIT Schwarzman College of Computing expansion', 'Climate Grand Challenges initiative', 'MIT moratorium on new programs using facial recognition'],
      studentLife: ['500+ student clubs', 'Living group system (dorms with distinct cultures)', 'MIT Sloan entrepreneurship ecosystem', 'Intramural sports ("IM" culture)'],
    },
    essayTip: 'MIT wants builders and tinkerers. Show what you\'ve made, broken, and rebuilt — hands-on > theoretical.',
  },
  {
    id: 'harvard',
    name: 'Harvard University',
    location: 'Cambridge, MA',
    acceptanceRate: '3.4%',
    avgSAT: '1500-1570',
    avgGPA: '3.95',
    deadlines: { ea: 'Nov 1', rd: 'Jan 1' },
    prompts: [
      { id: 'harv-1', text: 'Harvard has long recognized the importance of enrolling a diverse student body. How will the life experiences that shape who you are today enable you to contribute to Harvard?', type: 'diversity', wordLimit: 200, required: true },
      { id: 'harv-2', text: 'Briefly describe an intellectual experience that was important to you.', type: 'intellectual', wordLimit: 200, required: true },
      { id: 'harv-3', text: 'Briefly describe how you hope to use your college education.', type: 'future', wordLimit: 200, required: true },
      { id: 'harv-4', text: 'Top 3 things your roommates might like to know about you.', type: 'roommate', wordLimit: 200, required: true },
      { id: 'harv-5', text: 'How do you spend a typical day after school?', type: 'activity', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['Open Curriculum within Harvard College', 'Freshman Seminar Program (small classes with top faculty)', 'Harvard Innovation Labs (i-lab)', 'Radcliffe Institute fellowships', 'General Education curriculum'],
      notableFeatures: ['House system (12 residential houses, each with unique culture)', 'Shopping Week (try courses before committing)', 'Extensive library system (largest university library in the world)', 'Concentration + secondary field flexibility'],
      campusCulture: ['Housing Day (March celebration)', 'Primal Scream before finals', 'Harvard-Yale "The Game"', 'Crimson newspaper (oldest daily college paper)'],
      recentNews: ['Test-required policy reinstated for 2025-26', 'Harvard Salata Institute for Climate and Sustainability', 'New Quantum Science and Engineering PhD program'],
      studentLife: ['400+ student organizations', 'Extensive intramural sports', 'First-Year Outdoor Program (FOP)', 'Harvard Undergraduate Research Journal'],
    },
    essayTip: 'Harvard\'s supplements are short (200 words). Every word matters. Be specific and cut anything generic.',
  },
  {
    id: 'yale',
    name: 'Yale University',
    location: 'New Haven, CT',
    acceptanceRate: '4.6%',
    avgSAT: '1500-1560',
    avgGPA: '3.95',
    deadlines: { ea: 'Nov 1', rd: 'Jan 2' },
    prompts: [
      { id: 'yale-1', text: 'What is it about Yale that has led you to apply?', type: 'why_us', wordLimit: 125, required: true },
      { id: 'yale-2', text: 'Think about an idea or topic that has been intellectually exciting for you. Why are you drawn to it?', type: 'intellectual', wordLimit: 250, required: true },
      { id: 'yale-3', text: 'Tell us about your engagement with a community to which you belong. How do you feel you have contributed to this community?', type: 'community', wordLimit: 250, required: true },
      { id: 'yale-4', text: 'Reflect on a time you discussed an issue important to you with someone holding an opposing view. How did the experience affect your own thinking?', type: 'challenge', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Directed Studies (intensive first-year humanities sequence)', 'Yale-NUS (international collaboration)', 'Jackson School of Global Affairs', 'Center for Engineering Innovation & Design', 'Grand Strategy program'],
      notableFeatures: ['Residential college system (14 colleges)', 'Shopping period for courses', 'Senior essay or project in most majors', 'Distributional requirements (breadth-focused)'],
      campusCulture: ['Residential college rivalries and pride', 'a cappella culture (Whiffenpoofs, etc.)', 'Dwight Hall community service center', 'Harvard-Yale Game'],
      recentNews: ['New residential colleges opened', 'Yale Quantum Institute expansion', 'Expanded financial aid — no loans policy'],
      studentLife: ['500+ student organizations', 'Yale Daily News', 'Bulldog Days (admitted students weekend)', 'Extensive performing arts scene'],
    },
    essayTip: 'Yale\'s "Why Yale" is only 125 words — ultra-specific. Name a class, professor, or tradition. Generic = rejection.',
  },
  {
    id: 'upenn',
    name: 'University of Pennsylvania',
    location: 'Philadelphia, PA',
    acceptanceRate: '5.7%',
    avgSAT: '1500-1560',
    avgGPA: '3.94',
    deadlines: { ed: 'Nov 1', rd: 'Jan 5' },
    prompts: [
      { id: 'penn-1', text: 'How will you explore your intellectual and academic interests at the University of Pennsylvania? Please answer this question given the specific undergraduate school to which you are applying.', type: 'why_us', wordLimit: 200, required: true },
      { id: 'penn-2', text: 'At Penn, learning and growth happen outside of the classroom, too. How will you explore the community at Penn? Consider how this community will help shape your perspective and identity, and how your identity and perspective will help shape this community.', type: 'community', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['Wharton School (undergraduate business)', 'Jerome Fisher M&T (Management & Technology dual degree)', 'Huntsman Program in International Studies & Business', 'Vagelos Life Sciences & Management', 'Coordinated Dual Degree programs between schools'],
      notableFeatures: ['One University policy (take classes across all 4 schools)', 'Penn Integrates Knowledge (PIK) professors', 'Center for Undergraduate Research & Fellowships', '12 libraries including Van Pelt'],
      campusCulture: ['Hey Day tradition', 'Toast throwing at football games', 'Spring Fling concert', 'Locust Walk (social epicenter)'],
      recentNews: ['Amy Gutmann Presidential Center opening', 'Penn First Plus support for first-generation students', 'New College House system expansion'],
      studentLife: ['450+ student clubs', 'Social Planning & Events Committee (SPEC)', 'Daily Pennsylvanian newspaper', 'Strong Greek life presence'],
    },
    essayTip: 'Penn wants interdisciplinary thinkers. Show how you\'d combine resources across their four schools — don\'t stay in one lane.',
  },
  {
    id: 'columbia',
    name: 'Columbia University',
    location: 'New York, NY',
    acceptanceRate: '3.9%',
    avgSAT: '1510-1560',
    avgGPA: '3.95',
    deadlines: { ed: 'Nov 1', rd: 'Jan 1' },
    prompts: [
      { id: 'col-1', text: 'Why are you interested in attending Columbia University? We encourage you to consider the aspect(s) that you find unique and compelling about Columbia.', type: 'why_us', wordLimit: 200, required: true },
      { id: 'col-2', text: 'Columbia students take an pointedly eclectic approach to their education. Tell us about your experience with an unexpected connection you\'ve made, or Search for that involves 2+ seemingly unrelated topics.', type: 'intellectual', wordLimit: 200, required: true },
      { id: 'col-3', text: 'In college/life, you will encounter people who think differently than you do. How will you respond to this? How do you think this will prepare you to be a global citizen?', type: 'diversity', wordLimit: 200, required: true },
      { id: 'col-4', text: 'Please tell us what from your current and past experiences (either academic or personal) has motivated your areas of study or prospective major(s) at Columbia.', type: 'future', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['Core Curriculum (shared intellectual experience)', 'Columbia-Juilliard joint program', 'Dual BA with Sciences Po or Trinity College Dublin', 'Data Science Institute', 'Earth Institute sustainability programs'],
      notableFeatures: ['Core Curriculum (Literature Humanities, Contemporary Civilization, Art Humanities, Music Humanities)', 'NYC as an extended campus', 'Undergraduate research with world-class faculty', 'Strong pre-professional advising'],
      campusCulture: ['Orgo Night (midnight study break tradition)', 'Varsity Show (oldest college musical)', 'Low Library steps as gathering spot', 'Morningside Heights neighborhood community'],
      recentNews: ['Columbia Climate School launched', 'New Manhattanville campus development', 'Expansion of financial aid for middle-income families'],
      studentLife: ['500+ student organizations', 'Columbia Spectator newspaper', 'Extensive performing arts (Barnard-Columbia collaboration)', 'Strong political activism tradition'],
    },
    essayTip: 'Columbia loves the Core. Reference specific Core texts or ideas. Show you\'re excited about intellectual breadth, not just your major.',
  },
  {
    id: 'uchicago',
    name: 'University of Chicago',
    location: 'Chicago, IL',
    acceptanceRate: '5.2%',
    avgSAT: '1510-1570',
    avgGPA: '3.96',
    deadlines: { ea: 'Nov 1', ed: 'Nov 1', ed2: 'Jan 4', rd: 'Jan 4' },
    prompts: [
      { id: 'uchi-1', text: 'How does the University of Chicago, as you know it now, satisfy your desire for a particular kind of learning, community, and future? Please address with some specificity your own wishes and how they relate to UChicago.', type: 'why_us', wordLimit: 0, required: true },
      { id: 'uchi-2', text: 'Extended Essay: Choose one of UChicago\'s famously quirky essay prompts (changes yearly). These are intentionally unconventional and invite creative, intellectual exploration.', type: 'creative', wordLimit: 0, required: true },
    ],
    research: {
      uniquePrograms: ['Core Curriculum (common intellectual foundation)', 'Metcalf Internship Program', 'Institute of Politics', 'Argonne National Laboratory partnership', 'Harris School of Public Policy research opportunities'],
      notableFeatures: ['Quarter system (fast-paced, more courses)', 'Uncommon Core (rigorous but exploratory)', 'Dedicated pre-med, pre-law, and pre-business advising', 'Civilization Studies sequences'],
      campusCulture: ['Scavenger Hunt (ScavHunt — massive multi-day competition)', '"Life of the Mind" ethos', '"Where fun comes to die" (reclaimed with pride)', 'Kuviasungnerk/Kangerhlugasuk (Kuvia) winter festival'],
      recentNews: ['UChicago Crime Lab expansion for evidence-based policy', 'New David Rubenstein Forum conference center', 'Expanded Odyssey Scholarships for low-income students'],
      studentLife: ['400+ RSOs (Registered Student Organizations)', 'Doc Films (oldest student film society in the country)', 'Strong intramural sports culture', 'House system within residence halls'],
    },
    essayTip: 'UChicago\'s extended essay is a playground — be weird, be intellectual, be yourself. The quirkier your thinking, the better.',
  },
  {
    id: 'duke',
    name: 'Duke University',
    location: 'Durham, NC',
    acceptanceRate: '5.0%',
    avgSAT: '1500-1560',
    avgGPA: '3.94',
    deadlines: { ed: 'Nov 1', rd: 'Jan 4' },
    prompts: [
      { id: 'duke-1', text: 'What is your sense of Duke as a university and a community, and why do you consider it a good match for you? If there\'s something in particular about our offerings that attracts you, feel free to share that as well.', type: 'why_us', wordLimit: 250, required: true },
      { id: 'duke-2', text: 'Duke\'s commitment to inclusion and belonging includes sexual orientation, gender identity, and gender expression. Feel free to share with us more about how your identity in this context has meaning for you as an individual or as a member of a community.', type: 'identity', wordLimit: 250, required: false },
    ],
    research: {
      uniquePrograms: ['Bass Connections (interdisciplinary team research)', 'DukeEngage (immersive civic engagement)', 'Innovation & Entrepreneurship Initiative', 'Duke University Marine Lab', 'Program II (design your own major)'],
      notableFeatures: ['Trinity College of Arts & Sciences + Pratt School of Engineering', 'Focus Program (first-semester interdisciplinary clusters)', 'Duke Immerse (semester-long deep dives)', 'Certificate programs alongside major'],
      campusCulture: ['Cameron Crazies (basketball culture)', 'Krzyzewskiville (camping out for basketball tickets)', 'Duke Chapel as campus centerpiece', 'Last Day of Classes (LDOC) festival'],
      recentNews: ['Duke Climate Commitment launched', 'New West Campus expansion', 'Enhanced financial aid — no-loan policy for families under $150k'],
      studentLife: ['400+ student organizations', 'Duke Chronicle student newspaper', 'Strong selective living groups (SLGs)', 'Duke Gardens as study/social space'],
    },
    essayTip: 'Duke values "the Duke Difference" — where intellectual rigor meets warm community. Show both head and heart.',
  },
  {
    id: 'northwestern',
    name: 'Northwestern University',
    location: 'Evanston, IL',
    acceptanceRate: '7.0%',
    avgSAT: '1490-1560',
    avgGPA: '3.93',
    deadlines: { ed: 'Nov 1', rd: 'Jan 3' },
    prompts: [
      { id: 'nw-1', text: 'We want to understand what excites you intellectually, personally, or creatively. Help us get to know you through one of the following: (1) What are the intersections of your interests? (2) What do you hope to explore at Northwestern?', type: 'why_us', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['Medill School of Journalism', 'Bienen School of Music', 'Integrated Science Program (ISP)', 'Murphy Scholars (community engagement)', 'Kellogg Certificate for Undergrads'],
      notableFeatures: ['Quarter system with co-op opportunities', 'Dual degree programs across schools', 'Chicago proximity (internships, culture)', 'Undergraduate research grants'],
      campusCulture: ['Dillo Day (music festival)', 'Primal Scream during finals', 'Dance Marathon (DM — largest student-run philanthropy)', 'Wildcat Welcome'],
      recentNews: ['Ryan STEM Center opening', 'Northwestern-Qatar campus expansion', 'New Center for Synthetic Biology'],
      studentLife: ['500+ student groups', 'Daily Northwestern newspaper', 'Strong performing arts scene', 'Big Ten athletics'],
    },
    essayTip: 'Northwestern loves interdisciplinary thinkers. Show how you\'d combine their schools — Weinberg + Medill, Engineering + Music, etc.',
  },
  {
    id: 'brown',
    name: 'Brown University',
    location: 'Providence, RI',
    acceptanceRate: '5.1%',
    avgSAT: '1500-1560',
    avgGPA: '3.94',
    deadlines: { ed: 'Nov 1', rd: 'Jan 5' },
    prompts: [
      { id: 'brown-1', text: 'Brown\'s Open Curriculum allows students to explore broadly while also diving deeply into their academic interests. Tell us about any academic interests that excite you, and how you might use the Open Curriculum to pursue them while also embracing topics with which you are unfamiliar.', type: 'why_us', wordLimit: 250, required: true },
      { id: 'brown-2', text: 'Students entering Brown often find that communities they belong to shift and change in unexpected ways. Tell us about a community you belong to and the role it has played in your life.', type: 'community', wordLimit: 250, required: true },
      { id: 'brown-3', text: 'Brown students care deeply about their work and the world around them. Students find meaning and purpose in connections to their communities. Tell us about a place or community you call home.', type: 'identity', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Open Curriculum (no required courses outside concentration)', 'PLME (8-year BS/MD program)', 'Brown-RISD Dual Degree', 'Engaged Scholars Program', 'Liberal Medical Education'],
      notableFeatures: ['S/NC grading option for any course', 'No required general education courses', 'Independent concentrations (design your own)', 'Undergraduate Teaching and Research Awards'],
      campusCulture: ['Campus Dance (welcome event)', 'Spring Weekend festival', 'Naked Donut Run during finals', 'Strong social justice activism'],
      recentNews: ['Brown test-required policy reinstated', 'New Engineering Research Center', 'Expanded financial aid — no loans'],
      studentLife: ['400+ student organizations', 'Brown Daily Herald', 'Strong improv and theater scene', 'Meiklejohn peer advising program'],
    },
    essayTip: 'Brown is all about the Open Curriculum. Don\'t just say "I like freedom" — show the specific, unusual course combinations you\'d take.',
  },
  {
    id: 'michigan',
    name: 'University of Michigan',
    location: 'Ann Arbor, MI',
    acceptanceRate: '17.7%',
    avgSAT: '1380-1540',
    avgGPA: '3.90',
    deadlines: { ea: 'Nov 1', rd: 'Feb 1' },
    prompts: [
      { id: 'mich-1', text: 'Describe the unique qualities that attract you to the specific undergraduate College or School (including preferred admission and dual degree programs) to which you are applying at the University of Michigan. How would that curriculum support your interests?', type: 'why_us', wordLimit: 550, required: true },
      { id: 'mich-2', text: 'Everyone belongs to many different communities and/or groups defined by (among other things) shared geography, religion, ethnicity, income, cuisine, interest, race, ideology, or intellectual heritage. Choose one of the communities to which you belong, and describe that community and your place within it.', type: 'community', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['Ross School of Business (undergraduate)', 'LSA Honors Program', 'Michigan Research Community', 'Stamps School of Art & Design', 'Gerald R. Ford School of Public Policy'],
      notableFeatures: ['UROP (Undergraduate Research Opportunity Program)', 'M-STEM Academies', 'Semester-long study abroad programs', 'Multi-disciplinary design minor'],
      campusCulture: ['Michigan football (The Big House — largest stadium in US)', 'Hail to the Victors fight song', 'Hash Bash tradition', 'Festifall student org fair'],
      recentNews: ['Go Blue Guarantee (free tuition for in-state families under $75k)', 'New climate action plan', 'Michigan Medicine expansion'],
      studentLife: ['1,600+ student organizations', 'Michigan Daily newspaper', 'Extensive Greek life', 'MUSIC Matters concerts'],
    },
    essayTip: 'Michigan\'s "Why Us" is 550 words — use the space. Be ultra-specific about programs, courses, and professors. They can tell when you haven\'t researched.',
  },
  {
    id: 'nyu',
    name: 'New York University',
    location: 'New York, NY',
    acceptanceRate: '12.2%',
    avgSAT: '1430-1540',
    avgGPA: '3.85',
    deadlines: { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 5' },
    prompts: [
      { id: 'nyu-1', text: 'We would like to know more about your interest in NYU. What motivated you to apply to NYU? Why have you applied or expressed interest in a particular campus, school, college, program, and/or area of study?', type: 'why_us', wordLimit: 400, required: true },
    ],
    research: {
      uniquePrograms: ['Tisch School of the Arts', 'Stern School of Business (undergraduate)', 'Gallatin School of Individualized Study', 'Global Liberal Studies', 'Tandon School of Engineering'],
      notableFeatures: ['Global Network University (study away at 12+ global sites)', 'NYC as your campus', 'Abu Dhabi and Shanghai portal campuses', 'Strong internship placement in media, finance, arts'],
      campusCulture: ['Washington Square Park as campus quad', 'Violet pride (no traditional campus but strong community)', 'All-University Games', 'Strawberry Festival in spring'],
      recentNews: ['NYU expanded no-loan financial aid', 'New Paulson Center for Engineering and Computer Science', 'NYU Langone Health expansion'],
      studentLife: ['400+ student clubs', 'Washington Square News', 'Strong performing arts community', 'Extensive study abroad participation'],
    },
    essayTip: 'NYU wants to know why NYC matters to your education. Don\'t just say "I love the city" — connect specific NYC resources to your academic goals.',
  },
  {
    id: 'usc',
    name: 'University of Southern California',
    location: 'Los Angeles, CA',
    acceptanceRate: '9.9%',
    avgSAT: '1440-1540',
    avgGPA: '3.90',
    deadlines: { ea: 'Nov 1', rd: 'Jan 15' },
    prompts: [
      { id: 'usc-1', text: 'Describe how you plan to pursue your academic interests and why you want to explore them at USC specifically. Please feel free to address your first- and second-choice major selections.', type: 'why_us', wordLimit: 250, required: true },
      { id: 'usc-2', text: 'Describe yourself in three words and then explain what each word means to you or why you chose it.', type: 'identity', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['School of Cinematic Arts (top film school)', 'Iovine and Young Academy (arts + design + engineering + business)', 'Annenberg School of Communication', 'Viterbi School of Engineering', 'Progressive Degree Programs (4+1 BS/MS)'],
      notableFeatures: ['Trojan Family network (massive alumni network)', 'Los Angeles location (entertainment, tech, healthcare)', 'Thematic Option honors GE program', 'Joint programs across 23 schools'],
      campusCulture: ['Fight On! spirit', 'Song Girls and Spirit of Troy marching band', 'Conquest (football rivalry with UCLA)', 'Explore USC admitted students event'],
      recentNews: ['USC Village campus expansion', 'New Advanced Science and Technology Center', 'Expanded need-blind admissions'],
      studentLife: ['1,000+ student organizations', 'Daily Trojan newspaper', 'Strong Greek life', 'Career Center rated among the best'],
    },
    essayTip: 'USC loves the "Trojan Family" concept. Show how you\'ll contribute to community, not just take from resources.',
  },
  {
    id: 'georgia_tech',
    name: 'Georgia Institute of Technology',
    location: 'Atlanta, GA',
    acceptanceRate: '16%',
    avgSAT: '1400-1540',
    avgGPA: '3.90',
    deadlines: { ea: 'Nov 1', rd: 'Jan 4' },
    prompts: [
      { id: 'gt-1', text: 'Why do you want to study your chosen major at Georgia Tech, and how do you think Georgia Tech will prepare you for your career goals?', type: 'why_us', wordLimit: 300, required: true },
      { id: 'gt-2', text: 'Georgia Tech\'s motto is "Progress and Service." How do you intend to make a positive impact on society?', type: 'community', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['CREATE-X startup launch program', 'Vertically Integrated Projects (VIP)', 'GT Computing (top CS program)', 'Cooperative Education Program (co-op)', 'Center for Music Technology'],
      notableFeatures: ['InVenture Prize (Shark Tank for students)', 'Strong industry partnerships', 'Atlanta tech ecosystem access', 'Research with 100+ centers and labs'],
      campusCulture: ['Ramblin\' Wreck fight song', 'Stealing the T from Tech Tower', 'ANAK Society traditions', 'Midnight Bud (1am bike ride)'],
      recentNews: ['New STEM research building', 'AI manufacturing institute expansion', 'Expanded online MS Computer Science program'],
      studentLife: ['500+ student organizations', 'Technique yearbook (student-run since 1911)', 'Inventure Prize competition', 'Club and intramural sports'],
    },
    essayTip: 'Georgia Tech values impact. Don\'t just talk about learning — show what you\'ll build and how it helps people.',
  },
  {
    id: 'ucberkeley',
    name: 'UC Berkeley',
    location: 'Berkeley, CA',
    acceptanceRate: '11.6%',
    avgSAT: '1400-1540',
    avgGPA: '3.91',
    deadlines: { rd: 'Nov 30' },
    prompts: [
      { id: 'ucb-1', text: 'Describe how you have taken advantage of a significant educational opportunity or worked to overcome an educational barrier you have faced.', type: 'challenge', wordLimit: 350, required: false },
      { id: 'ucb-2', text: 'Every person has a creative side, and it can be expressed in many ways: problem solving, original and innovative thinking, and artistically, to name a few. Describe how you express your creative side.', type: 'creative', wordLimit: 350, required: false },
      { id: 'ucb-3', text: 'What would you say is your greatest talent or skill? How have you developed and demonstrated that talent over time?', type: 'activity', wordLimit: 350, required: false },
      { id: 'ucb-4', text: 'Describe the most significant challenge you have faced and the steps you have taken to overcome this challenge. How has this challenge affected your academic achievement?', type: 'challenge', wordLimit: 350, required: false },
    ],
    research: {
      uniquePrograms: ['EECS (top electrical engineering and computer science)', 'Discovery Program (interdisciplinary research)', 'Haas School of Business undergraduate', 'Berkeley Lab partnerships', 'Global Studies program'],
      notableFeatures: ['UC-wide Personal Insight Questions (PIQs)', 'Undergraduate Research Apprenticeship Program (URAP)', 'DeCal student-taught courses', 'CalCentral academic planning'],
      campusCulture: ['Free Speech Movement legacy', 'Big Game vs Stanford', 'Cal Day open house', 'Sproul Plaza activism'],
      recentNews: ['Berkeley Gateway project underway', 'Division of Computing, Data Science, and Society expansion', 'New student housing initiatives'],
      studentLife: ['1,000+ student organizations', 'Daily Californian newspaper', 'Cal Band tradition', 'Strong co-op housing community'],
    },
    essayTip: 'UC schools use PIQs — pick 4 out of 8. Choose prompts where you have the strongest, most specific stories. Don\'t repeat themes across your 4.',
  },
];

/* ─── PROMPT CATEGORIZATION ENGINE ─── */

export function classifyPromptType(promptText: string): PromptType {
  const lower = promptText.toLowerCase();
  let bestType: PromptType = 'other';
  let bestScore = 0;

  for (const pt of PROMPT_TYPES) {
    if (pt.type === 'other') continue;
    let score = 0;
    for (const kw of pt.keywords) {
      if (lower.includes(kw)) score += kw.split(' ').length; // multi-word keywords score higher
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = pt.type;
    }
  }
  return bestType;
}

export function getPromptTypeInfo(type: PromptType): PromptTypeInfo {
  return PROMPT_TYPES.find(pt => pt.type === type) || PROMPT_TYPES[PROMPT_TYPES.length - 1];
}

/* ─── SEARCH / LOOKUP HELPERS ─── */

export function findSchoolByName(name: string): SchoolData | undefined {
  const lower = name.toLowerCase().trim();
  return SCHOOLS.find(s =>
    s.name.toLowerCase().includes(lower) ||
    s.id.includes(lower.replace(/\s+/g, '_')) ||
    lower.includes(s.name.toLowerCase().split(' ')[0]) // match first word
  );
}

export function getSchoolPromptsByType(schoolId: string): Map<PromptType, SupplementalPrompt[]> {
  const school = SCHOOLS.find(s => s.id === schoolId);
  if (!school) return new Map();
  const map = new Map<PromptType, SupplementalPrompt[]>();
  for (const p of school.prompts) {
    const existing = map.get(p.type) || [];
    existing.push(p);
    map.set(p.type, existing);
  }
  return map;
}

/* ─── ESSAY REUSE ENGINE ─── */

export interface ReuseMatch {
  sourceEssayId: string;
  sourceEssayTitle: string;
  targetPrompt: SupplementalPrompt;
  targetSchool: SchoolData;
  matchScore: number;         // 0–100
  matchReasons: string[];
  adaptationNotes: string[];  // what to change
}

interface EssayForMatching {
  id: string;
  title: string;
  prompt: string;
  content: string;
}

export function findReuseOpportunities(
  essays: EssayForMatching[],
  targetSchools: string[]   // school names from tracker
): ReuseMatch[] {
  const matches: ReuseMatch[] = [];

  for (const essay of essays) {
    if (!essay.content || essay.content.trim().length < 50) continue;

    const essayType = classifyPromptType(essay.prompt || essay.title);
    const essayLower = essay.content.toLowerCase();

    for (const schoolName of targetSchools) {
      const school = findSchoolByName(schoolName);
      if (!school) continue;

      for (const prompt of school.prompts) {
        let score = 0;
        const reasons: string[] = [];
        const adaptations: string[] = [];

        // Type match (strongest signal)
        if (essayType === prompt.type) {
          score += 40;
          reasons.push(`Both are "${getPromptTypeInfo(prompt.type).label}" type essays`);
        }

        // Cross-type compatibility
        const compatibleTypes: Record<string, PromptType[]> = {
          'community': ['diversity', 'identity'],
          'diversity': ['community', 'identity'],
          'identity': ['community', 'challenge', 'diversity'],
          'challenge': ['identity', 'activity'],
          'intellectual': ['why_us', 'creative'],
          'why_us': ['intellectual', 'future'],
          'activity': ['challenge', 'community'],
          'future': ['why_us', 'intellectual'],
          'creative': ['intellectual', 'identity'],
          'roommate': ['identity', 'activity'],
        };
        if (compatibleTypes[essayType]?.includes(prompt.type)) {
          score += 20;
          reasons.push(`"${getPromptTypeInfo(essayType).label}" essays often adapt well to "${getPromptTypeInfo(prompt.type).label}" prompts`);
        }

        // Content-keyword overlap with prompt
        const promptKeywords = prompt.text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        const matchedKeywords = promptKeywords.filter(kw => essayLower.includes(kw));
        const keywordOverlap = promptKeywords.length > 0 ? matchedKeywords.length / promptKeywords.length : 0;
        if (keywordOverlap > 0.15) {
          score += Math.round(keywordOverlap * 30);
          reasons.push(`Content overlaps with prompt themes`);
        }

        // Theme detection in essay content
        const themeSignals: Record<PromptType, string[]> = {
          'why_us': ['program', 'campus', 'university', 'school', 'study'],
          'community': ['community', 'together', 'group', 'team', 'belong'],
          'intellectual': ['research', 'question', 'explore', 'curious', 'fascinated', 'idea'],
          'activity': ['practice', 'hours', 'competition', 'team', 'club', 'organization'],
          'identity': ['who I am', 'background', 'culture', 'family', 'heritage', 'shaped'],
          'challenge': ['difficult', 'struggle', 'overcome', 'failure', 'learned', 'setback'],
          'creative': ['imagine', 'create', 'design', 'build', 'express'],
          'future': ['want to', 'hope to', 'career', 'goal', 'aspire', 'plan'],
          'diversity': ['diverse', 'perspective', 'different', 'inclusion'],
          'roommate': ['know about me', 'fun fact', 'personality'],
          'other': [],
        };
        const targetSignals = themeSignals[prompt.type] || [];
        const themeMatches = targetSignals.filter(s => essayLower.includes(s)).length;
        if (themeMatches >= 2) {
          score += 15;
          reasons.push(`Essay naturally touches on ${getPromptTypeInfo(prompt.type).label.toLowerCase()} themes`);
        }

        // Word count compatibility
        if (prompt.wordLimit > 0) {
          const essayWords = essay.content.trim().split(/\s+/).length;
          if (essayWords > prompt.wordLimit * 1.5) {
            adaptations.push(`Trim from ${essayWords} to ${prompt.wordLimit} words`);
          } else if (essayWords < prompt.wordLimit * 0.5) {
            adaptations.push(`Expand from ${essayWords} to ~${prompt.wordLimit} words`);
            score -= 10; // harder to expand
          }
        }

        // School-specific adaptation always needed for "why_us"
        if (prompt.type === 'why_us') {
          adaptations.push(`Add specific ${school.name} references (programs, faculty, traditions)`);
          if (essayType !== 'why_us') {
            adaptations.push(`Reframe around why ${school.name} specifically`);
          }
        }

        // Generic adaptation note
        if (adaptations.length === 0 && score > 30) {
          adaptations.push(`Tailor opening/closing to address ${school.name}'s specific prompt`);
        }

        if (score >= 30) {
          matches.push({
            sourceEssayId: essay.id,
            sourceEssayTitle: essay.title,
            targetPrompt: prompt,
            targetSchool: school,
            matchScore: Math.min(score, 100),
            matchReasons: reasons,
            adaptationNotes: adaptations,
          });
        }
      }
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

/* ─── DEADLINE INTELLIGENCE ─── */

export interface DeadlineTask {
  id: string;
  label: string;
  dueDescription: string;
  daysUntil: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  school?: string;
  category: 'essay' | 'test' | 'rec_letter' | 'form' | 'financial';
}

export function generateSmartTimeline(
  schools: { name: string; deadline: string; type: string; status: string; tasks: { label: string; done: boolean }[] }[]
): DeadlineTask[] {
  const timeline: DeadlineTask[] = [];
  const now = Date.now();

  for (const school of schools) {
    if (!school.deadline || school.status === 'submitted' || school.status === 'accepted') continue;

    const deadlineDate = new Date(school.deadline).getTime();
    const daysUntil = Math.ceil((deadlineDate - now) / 86400000);
    if (daysUntil < -30) continue; // skip very old deadlines

    // Generate smart tasks based on days remaining
    const incompleteTasks = school.tasks.filter(t => !t.done);

    for (const task of incompleteTasks) {
      let category: DeadlineTask['category'] = 'form';
      if (task.label.toLowerCase().includes('essay')) category = 'essay';
      else if (task.label.toLowerCase().includes('test') || task.label.toLowerCase().includes('score')) category = 'test';
      else if (task.label.toLowerCase().includes('rec')) category = 'rec_letter';
      else if (task.label.toLowerCase().includes('financial') || task.label.toLowerCase().includes('css') || task.label.toLowerCase().includes('fafsa')) category = 'financial';

      let priority: DeadlineTask['priority'] = 'low';
      // Rec letters need the most lead time
      if (category === 'rec_letter') {
        if (daysUntil <= 14) priority = 'critical';
        else if (daysUntil <= 30) priority = 'high';
        else if (daysUntil <= 60) priority = 'medium';
      }
      // Essays need revision time
      else if (category === 'essay') {
        if (daysUntil <= 7) priority = 'critical';
        else if (daysUntil <= 21) priority = 'high';
        else if (daysUntil <= 45) priority = 'medium';
      }
      // Other items
      else {
        if (daysUntil <= 3) priority = 'critical';
        else if (daysUntil <= 14) priority = 'high';
        else if (daysUntil <= 30) priority = 'medium';
      }

      let dueDescription: string;
      if (daysUntil < 0) dueDescription = `${Math.abs(daysUntil)} days overdue`;
      else if (daysUntil === 0) dueDescription = 'Due today';
      else if (daysUntil === 1) dueDescription = 'Due tomorrow';
      else if (daysUntil <= 7) dueDescription = `${daysUntil} days left`;
      else if (daysUntil <= 30) dueDescription = `${Math.ceil(daysUntil / 7)} weeks left`;
      else dueDescription = `${Math.ceil(daysUntil / 30)} months left`;

      // Smart suggestion: when to start based on category
      if (category === 'rec_letter' && daysUntil > 30 && priority === 'medium') {
        dueDescription += ' — ask now (teachers need 4+ weeks)';
      }
      if (category === 'essay' && daysUntil > 21 && daysUntil <= 45) {
        dueDescription += ' — start drafting';
      }

      timeline.push({
        id: `${school.name}-${task.label}`.replace(/\s+/g, '-').toLowerCase(),
        label: task.label,
        dueDescription,
        daysUntil,
        priority,
        school: school.name,
        category,
      });
    }
  }

  // Sort: critical first, then by days until deadline
  timeline.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.daysUntil - b.daysUntil;
  });

  return timeline;
}

/* ─── WEEKLY DIGEST ─── */

export interface WeeklyDigest {
  critical: DeadlineTask[];
  thisWeek: DeadlineTask[];
  upcoming: DeadlineTask[];
  onTrack: number;       // percentage of tasks done
  totalSchools: number;
  submittedSchools: number;
}

export function generateWeeklyDigest(
  timeline: DeadlineTask[],
  schools: { status: string; tasks: { done: boolean }[] }[]
): WeeklyDigest {
  const totalTasks = schools.reduce((s, sch) => s + sch.tasks.length, 0);
  const doneTasks = schools.reduce((s, sch) => s + sch.tasks.filter(t => t.done).length, 0);

  return {
    critical: timeline.filter(t => t.priority === 'critical'),
    thisWeek: timeline.filter(t => t.daysUntil >= 0 && t.daysUntil <= 7 && t.priority !== 'critical'),
    upcoming: timeline.filter(t => t.daysUntil > 7 && t.daysUntil <= 30).slice(0, 8),
    onTrack: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    totalSchools: schools.length,
    submittedSchools: schools.filter(s => ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(s.status)).length,
  };
}
