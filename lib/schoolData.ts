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
  /* ─── BATCH 2: 25 ADDITIONAL SCHOOLS ─── */
  {
    id: 'princeton',
    name: 'Princeton University',
    location: 'Princeton, NJ',
    acceptanceRate: '3.5%',
    avgSAT: '1510-1570',
    avgGPA: '3.95',
    deadlines: { ea: 'Nov 1', rd: 'Jan 1' },
    prompts: [
      { id: 'pri-1', text: 'Princeton values community and encourages students, faculty, staff and leadership to engage in respectful conversations. Please share a time where you have engaged in a conversation or Search for where a range of perspectives were discussed. What did you learn?', type: 'community', wordLimit: 250, required: true },
      { id: 'pri-2', text: 'Princeton has a longstanding commitment to service. Tell us how your story intersects with these ideals.', type: 'identity', wordLimit: 250, required: true },
      { id: 'pri-3', text: 'What is a topic or idea that excites you and is related to your intended area(s) of study? Tell us why.', type: 'intellectual', wordLimit: 250, required: true },
      { id: 'pri-4', text: 'What song represents the soundtrack of your life at this moment?', type: 'creative', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Certificate programs (Princeton\'s version of minors)', 'Bridge Year Program (gap year service)', 'Novogratz Bridge Year', 'Princeton Plasma Physics Laboratory', 'Keller Center for Innovation in Engineering Education'],
      notableFeatures: ['Junior Paper and Senior Thesis required in most departments', 'Residential college system (6 colleges)', 'Precepts (small discussion groups)', 'No graduate schools in law, medicine, or business'],
      campusCulture: ['Honor Code (student-run exams)', 'Reunions weekend (largest alumni gathering)', 'Eating clubs (unique social system)', 'Cane Spree and Bonfire traditions'],
      recentNews: ['Princeton expanded financial aid — no loans for any student', 'New Environmental Studies building', 'Quantum computing research expansion'],
      studentLife: ['300+ student organizations', 'Daily Princetonian newspaper', 'Strong a cappella scene', 'Outdoor Action pre-orientation'],
    },
    essayTip: 'Princeton cares about service and intellectual depth. The "soundtrack" essay is your chance to be personal and fun — don\'t pick an obvious song.',
  },
  {
    id: 'caltech',
    name: 'California Institute of Technology',
    location: 'Pasadena, CA',
    acceptanceRate: '2.7%',
    avgSAT: '1530-1580',
    avgGPA: '3.98',
    deadlines: { ea: 'Nov 1', rd: 'Jan 3' },
    prompts: [
      { id: 'calt-1', text: 'At Caltech, we investigate some of the most challenging, fundamental problems in science, technology, engineering, and mathematics. Caltech\'s mission — to expand human knowledge and benefit society through research integrated with education — relies on the hard work and creativity of our students. Describe an experience where you explored a topic or field beyond its surface level.', type: 'intellectual', wordLimit: 400, required: true },
      { id: 'calt-2', text: 'Caltech\'s collaborative, inclusive community is integral to our ability to achieve our educational mission. Please share what you would bring to the Caltech community.', type: 'community', wordLimit: 200, required: true },
      { id: 'calt-3', text: 'The creativity, inventiveness, and innovation of Caltech\'s students, faculty, and researchers have won Nobel Prizes and launched new fields of study. Tell us about a theory, principle, or concept in math or science that excites you. Why?', type: 'intellectual', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['SURF (Summer Undergraduate Research Fellowships)', 'JPL (Jet Propulsion Laboratory) access', 'Computation and Neural Systems', 'Applied and Computational Mathematics', 'LIGO gravitational wave observatory'],
      notableFeatures: ['3:1 student-to-faculty ratio', 'Honor Code governs all academics', 'Core curriculum (all students take physics, math, chemistry, biology)', 'Rotation system for choosing houses'],
      campusCulture: ['Ditch Day (senior prank tradition)', 'House system (8 undergraduate houses)', 'Pranking culture (MIT rivalry)', 'Olive Harvest tradition'],
      recentNews: ['Caltech AI4Science initiative launched', 'New Resnick Sustainability Institute projects', 'Expanded financial aid policy'],
      studentLife: ['100+ clubs (small school, tight community)', 'The California Tech newspaper', 'Interhouse sports competitions', 'Hackathon culture'],
    },
    essayTip: 'Caltech is purely STEM. Don\'t try to be well-rounded — show obsessive depth in science or math. They want to see you think like a researcher.',
  },
  {
    id: 'jhu',
    name: 'Johns Hopkins University',
    location: 'Baltimore, MD',
    acceptanceRate: '6.5%',
    avgSAT: '1500-1560',
    avgGPA: '3.94',
    deadlines: { ed: 'Nov 1', rd: 'Jan 2' },
    prompts: [
      { id: 'jhu-1', text: 'Founded in the spirit of exploration and discovery, Johns Hopkins University encourages students to share their perspectives, develop their interests, and join in the pursuit of new knowledge. Use this space to share something you\'d like the admissions committee to know about you.', type: 'identity', wordLimit: 400, required: true },
      { id: 'jhu-2', text: 'Tell us about an aspect of your identity or a personal quality that is important to you. Why is it meaningful?', type: 'identity', wordLimit: 350, required: true },
    ],
    research: {
      uniquePrograms: ['Applied Physics Laboratory (APL)', 'Bloomberg School of Public Health access', 'Biomedical Engineering (#1 ranked)', 'Peabody Conservatory (music)', 'Krieger-Eisenhower interdisciplinary research'],
      notableFeatures: ['Research university with $2.5B+ annual research spending', 'Pre-med focus with hospital on campus', 'Flexible curriculum — no core requirements', 'BA/MA programs available'],
      campusCulture: ['Blue Jay mascot', 'Spring Fair (student-run festival)', 'Lighting of the Quad ceremony', 'Lacrosse tradition (birthplace of college lacrosse)'],
      recentNews: ['Bloomberg Center for Public Innovation', 'New Homewood campus expansion', 'AI in healthcare research initiative'],
      studentLife: ['400+ student organizations', 'Johns Hopkins News-Letter (oldest college newspaper)', 'Strong pre-med community', 'Hopkins Student Enterprises'],
    },
    essayTip: 'JHU\'s prompt is very open. Use it to show something NOT in your Common App essay. Research-oriented stories resonate well here.',
  },
  {
    id: 'dartmouth',
    name: 'Dartmouth College',
    location: 'Hanover, NH',
    acceptanceRate: '6.2%',
    avgSAT: '1490-1560',
    avgGPA: '3.93',
    deadlines: { ed: 'Nov 1', rd: 'Jan 2' },
    prompts: [
      { id: 'dart-1', text: 'As you seek admission to Dartmouth\'s Class of 2030, what aspects of the college\'s academic program, community, and/or campus environment attract your interest? In short, why Dartmouth?', type: 'why_us', wordLimit: 100, required: true },
      { id: 'dart-2', text: 'There is a Quaker saying: Let your life speak. Describe the environment in which you were raised and the impact it has had on the person you are today.', type: 'identity', wordLimit: 250, required: true },
      { id: 'dart-3', text: '"What excites you?" (Choose one of several short-answer prompts)', type: 'intellectual', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['D-Plan (flexible year-round quarter system)', 'Tuck School of Business undergraduate access', 'Thayer School of Engineering', 'Dartmouth-Hitchcock Medical Center research', 'First-Year Student Enrichment Program'],
      notableFeatures: ['Quarter system (D-Plan lets you study off-campus)', 'Undergraduate-focused Ivy (no large graduate programs)', 'Study abroad programs in 40+ countries', 'Liberal arts emphasis with engineering school'],
      campusCulture: ['Dartmouth Outing Club (oldest collegiate outing club)', 'Green Key weekend', 'Bonfire on the Green', 'Homecoming traditions'],
      recentNews: ['Test-required policy reinstated', 'New Irving Institute for Energy and Society', 'Arthur L. Irving Institute expansion'],
      studentLife: ['350+ student organizations', 'The Dartmouth newspaper', 'Greek life (prominent social scene)', 'Winter Carnival tradition'],
    },
    essayTip: 'Dartmouth\'s "Why Dartmouth" is only 100 words — every word counts. Name specific programs, the D-Plan, or the outdoors culture.',
  },
  {
    id: 'cornell',
    name: 'Cornell University',
    location: 'Ithaca, NY',
    acceptanceRate: '7.9%',
    avgSAT: '1480-1560',
    avgGPA: '3.92',
    deadlines: { ed: 'Nov 1', rd: 'Jan 2' },
    prompts: [
      { id: 'corn-1', text: 'At Cornell, students are the architects of their own academic experience. Tell us about a topic, activity, or body of work you\'ve explored that excites you, and how you would like to explore it further at Cornell.', type: 'why_us', wordLimit: 650, required: true },
    ],
    research: {
      uniquePrograms: ['Hotel Administration (SHA — only program of its kind)', 'Industrial and Labor Relations (ILR)', 'College of Agriculture and Life Sciences', 'Architecture (5-year B.Arch)', 'Engineering co-op program'],
      notableFeatures: ['7 undergraduate colleges (each with distinct identity)', 'Any-door policy (explore across colleges)', 'Land-grant mission with Ivy prestige', 'Cornell Tech campus in NYC'],
      campusCulture: ['Slope Day end-of-year concert', 'Dragon Day (architecture tradition)', 'Gorge swimming and hiking', 'Cornell Chimes (bell tower)'],
      recentNews: ['Cornell Bowers CIS expanded (computing and information science)', 'Climate action plan for carbon neutrality', 'New North Campus residential expansion'],
      studentLife: ['1,000+ student organizations', 'Cornell Daily Sun newspaper', 'Strong sustainability culture', 'Homecoming and reunion traditions'],
    },
    essayTip: 'Cornell gives 650 words — use them. Be specific about which college you\'re applying to and why that particular program at Cornell matters to you.',
  },
  {
    id: 'rice',
    name: 'Rice University',
    location: 'Houston, TX',
    acceptanceRate: '7.7%',
    avgSAT: '1490-1560',
    avgGPA: '3.96',
    deadlines: { ed: 'Nov 1', rd: 'Jan 4' },
    prompts: [
      { id: 'rice-1', text: 'Please explain why you wish to study in the academic areas you selected and any relevant experience with those fields. If you are applying to one of our joint degree programs, please discuss your interest in the program and how it fits your intellectual and professional goals.', type: 'future', wordLimit: 150, required: true },
      { id: 'rice-2', text: 'Based upon your exploration of Rice University, what elements of the Rice experience appeal to you?', type: 'why_us', wordLimit: 150, required: true },
      { id: 'rice-3', text: 'Rice is lauded for creating a collaborative atmosphere that enhances the quality of life for all members of our campus community. The Residential College System, and honor code foster inclusiveness, and an ideal learning environment. What personal perspectives would you contribute?', type: 'community', wordLimit: 500, required: true },
      { id: 'rice-4', text: 'Please share an elaboration on an activity listed on your application that you\'d like us to know more about.', type: 'activity', wordLimit: 150, required: true },
    ],
    research: {
      uniquePrograms: ['Residential college system (11 colleges)', 'Rice Space Institute', 'Baker Institute for Public Policy', 'Bioengineering and NanoEngineering', 'Rice Design Alliance'],
      notableFeatures: ['No application fee', 'Unlimited meal plan at any residential college', 'Small classes (8:1 student-faculty ratio)', 'Pass/Fail first two weeks of freshman year'],
      campusCulture: ['Beer Bike Race (huge annual tradition)', 'O-Week (orientation run by students)', 'Willy\'s Pub (on-campus student-run pub)', 'Screw Yer Roommate (blind date tradition)'],
      recentNews: ['Rice Investment in innovation and entrepreneurship', 'New Engineering and Science Building', 'Houston medical center partnerships expanded'],
      studentLife: ['280+ student organizations', 'Rice Thresher newspaper', 'Strong residential college rivalry', 'Powderpuff football traditions'],
    },
    essayTip: 'Rice loves its residential college system. Show you understand the culture — collaborative, quirky, and tight-knit. Mention Beer Bike or O-Week.',
  },
  {
    id: 'vanderbilt',
    name: 'Vanderbilt University',
    location: 'Nashville, TN',
    acceptanceRate: '5.6%',
    avgSAT: '1490-1560',
    avgGPA: '3.93',
    deadlines: { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
    prompts: [
      { id: 'vand-1', text: 'Vanderbilt University values learning and growing through encounters with different perspectives and lived experiences. In our increasingly diverse and interconnected world, how might your unique life experiences and perspectives enrich our community?', type: 'diversity', wordLimit: 250, required: true },
      { id: 'vand-2', text: 'Vanderbilt offers a community where students find balance between their academic and social experiences. Please briefly elaborate on how one of your extracurricular activities or work experiences has influenced you.', type: 'activity', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Immersion Vanderbilt (experiential learning requirement)', 'Vanderbilt Medical Center research', 'Peabody College of Education (#1 ranked)', 'Blair School of Music', 'Vanderbilt Institute for Nanoscale Science and Engineering'],
      notableFeatures: ['Open curriculum within schools', 'AXLE core curriculum (aesthetics, expressions of culture)', 'Nashville as a living laboratory', 'Strong pre-med and pre-law placement'],
      campusCulture: ['Commodore spirit', 'Rites of Spring music festival', 'Anchor Down tradition', 'The Martha Rivers Ingram Commons (first-year experience)'],
      recentNews: ['New residential college expansion', 'Vanderbilt opens Data Science Institute', 'Record-breaking application numbers'],
      studentLife: ['500+ student organizations', 'Vanderbilt Hustler newspaper', 'Greek life (significant presence)', 'Nashville music and arts scene access'],
    },
    essayTip: 'Vanderbilt values Nashville as part of the experience. Show how you\'d use the city — not just the campus — in your education.',
  },
  {
    id: 'notredame',
    name: 'University of Notre Dame',
    location: 'Notre Dame, IN',
    acceptanceRate: '12.9%',
    avgSAT: '1430-1540',
    avgGPA: '3.91',
    deadlines: { ea: 'Nov 1', rd: 'Jan 1' },
    prompts: [
      { id: 'nd-1', text: 'Everyone has different priorities when choosing a college. What are yours and why is Notre Dame a good fit?', type: 'why_us', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['Mendoza College of Business (undergraduate)', 'Center for Social Concerns', 'GLOBES Environmental Science program', 'Alliance for Catholic Education', 'Medieval Institute'],
      notableFeatures: ['Catholic identity integrated with academics', 'First Year of Studies (common first year)', '80% of students study abroad', 'Strong alumni network and career placement'],
      campusCulture: ['Football Saturdays (iconic tradition)', 'Touchdown Jesus mural', 'Dorm rivalries (no Greek life)', 'Service-focused community'],
      recentNews: ['IDE (Innovation, De-Risking, Enterprise) expansion', 'New science building complex', 'Enhanced research funding'],
      studentLife: ['400+ student clubs', 'The Observer newspaper', 'Dorm-based social life', 'Bengal Bouts boxing charity tournament'],
    },
    essayTip: 'Notre Dame cares about community and values. Don\'t avoid the Catholic identity — engage with it thoughtfully, even if you\'re not Catholic.',
  },
  {
    id: 'washu',
    name: 'Washington University in St. Louis',
    location: 'St. Louis, MO',
    acceptanceRate: '11%',
    avgSAT: '1490-1560',
    avgGPA: '3.93',
    deadlines: { ed: 'Nov 1', ed2: 'Jan 2', rd: 'Jan 2' },
    prompts: [
      { id: 'washu-1', text: 'Tell us about something that really sparks your intellectual curiosity and why it matters to you.', type: 'intellectual', wordLimit: 200, required: true },
      { id: 'washu-2', text: 'WashU is a community that values diverse perspectives and experiences. How have your life experiences and background shaped who you are?', type: 'identity', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['Olin Business School (undergraduate)', 'Sam Fox School of Design & Visual Arts', 'Brown School of Social Work (access)', 'McDonnell Genome Institute', 'Institute for Public Health'],
      notableFeatures: ['Flexibility to take courses across all schools', 'Pre-med with medical school on campus', 'Dual-degree programs across schools', 'Strong undergraduate research culture'],
      campusCulture: ['W.I.L.D. (Walk In, Lay Down) concert series', 'THURTENE Carnival (student-run)', 'Bear mascot traditions', 'Danforth Campus beauty'],
      recentNews: ['McKelvey Engineering school expansion', 'New Interdisciplinary Sciences Building', 'Record endowment growth'],
      studentLife: ['400+ student organizations', 'Student Life newspaper', 'South 40 residential area', 'Strong Greek and social scene'],
    },
    essayTip: 'WashU loves intellectual curiosity. Be specific about an idea, not a subject. Show genuine wonder, not resume-polishing.',
  },
  {
    id: 'emory',
    name: 'Emory University',
    location: 'Atlanta, GA',
    acceptanceRate: '11.4%',
    avgSAT: '1430-1530',
    avgGPA: '3.90',
    deadlines: { ed: 'Nov 1', ed2: 'Jan 1', rd: 'Jan 1' },
    prompts: [
      { id: 'emo-1', text: 'What academic areas are you interested in exploring at Emory and why?', type: 'future', wordLimit: 150, required: true },
      { id: 'emo-2', text: 'What do you like to do in your free time?', type: 'activity', wordLimit: 150, required: true },
      { id: 'emo-3', text: 'Emory University has a deep history of engaging with the world around us. Share an example of when you\'ve been a change agent in your community.', type: 'community', wordLimit: 150, required: true },
    ],
    research: {
      uniquePrograms: ['Emory-Tibet Partnership (mind-body research)', 'CDC partnership (Centers for Disease Control on campus)', 'Goizueta Business School', 'Oxford College (two-year liberal arts start)', 'Global Health Institute'],
      notableFeatures: ['Atlanta location (CDC, CNN, Fortune 500 companies)', 'Small college feel with research university resources', 'Voluntary core curriculum', 'Scholars programs'],
      campusCulture: ['Dooley (unofficial skeleton mascot)', 'Songfest tradition', 'Wonderful Wednesday community events', 'Farm-to-fork dining'],
      recentNews: ['New Health Sciences Research Building', 'AI and ethics initiative launched', 'Enhanced arts and humanities investment'],
      studentLife: ['400+ student organizations', 'Emory Wheel newspaper', 'Outdoor Emory adventures', 'Lullwater Preserve on campus'],
    },
    essayTip: 'Emory\'s prompts are short (150 words). Be concise and specific. The CDC proximity is a great hook for health/science students.',
  },
  {
    id: 'georgetown',
    name: 'Georgetown University',
    location: 'Washington, DC',
    acceptanceRate: '12.2%',
    avgSAT: '1420-1540',
    avgGPA: '3.91',
    deadlines: { ea: 'Nov 1', rd: 'Jan 10' },
    prompts: [
      { id: 'gtown-1', text: 'Briefly discuss the significance to you of the school or summer activity in which you have been most involved.', type: 'activity', wordLimit: 0, required: true },
      { id: 'gtown-2', text: 'As Georgetown is a diverse community, the Admissions Committee would like to know more about you in your own words. Please submit a brief essay, either personal or creative, which you feel best describes you.', type: 'identity', wordLimit: 0, required: true },
      { id: 'gtown-3', text: 'Georgetown is a Jesuit university. Please discuss how your own experiences, perspectives, or beliefs might contribute to the tradition of dialogue and understanding.', type: 'diversity', wordLimit: 0, required: true },
    ],
    research: {
      uniquePrograms: ['Walsh School of Foreign Service (top international affairs)', 'McDonough School of Business', 'Georgetown Law Center', 'Berkley Center for Religion, Peace and World Affairs', 'Center for Security Studies'],
      notableFeatures: ['DC location (internships in government, policy, NGOs)', 'Jesuit values (cura personalis — care for the whole person)', 'Georgetown does NOT use Common App (own application)', 'Strong alumni network in politics and diplomacy'],
      campusCulture: ['Hoya Saxa! (fight cheer)', 'Georgetown basketball (Big East)', 'Hilltop community feel', 'Service learning embedded in curriculum'],
      recentNews: ['New School of Health expansion', 'Georgetown Institute for Women, Peace and Security growth', 'Global engagement programs expanded'],
      studentLife: ['300+ student organizations', 'The Hoya newspaper', 'Georgetown Program Board events', 'Service trips during breaks'],
    },
    essayTip: 'Georgetown has its own app — not Common App. Address the Jesuit mission directly. DC connections are a huge selling point — use them.',
  },
  {
    id: 'ucla',
    name: 'University of California, Los Angeles',
    location: 'Los Angeles, CA',
    acceptanceRate: '8.6%',
    avgSAT: '1400-1540',
    avgGPA: '3.93',
    deadlines: { rd: 'Nov 30' },
    prompts: [
      { id: 'ucla-1', text: 'Describe an example of your leadership experience in which you have positively influenced others, helped resolve disputes or contributed to group efforts over time.', type: 'activity', wordLimit: 350, required: false },
      { id: 'ucla-2', text: 'Think about an academic subject that inspires you. Describe how you have furthered this interest inside and/or outside of the classroom.', type: 'intellectual', wordLimit: 350, required: false },
      { id: 'ucla-3', text: 'Beyond what has already been shared in your application, what do you believe makes you a strong candidate for admissions to the University of California?', type: 'identity', wordLimit: 350, required: false },
    ],
    research: {
      uniquePrograms: ['UCLA Film, Television and Digital Media (top film school)', 'Anderson School of Management', 'David Geffen School of Medicine research', 'Institute for Society and Genetics', 'Undergraduate Research Centers'],
      notableFeatures: ['UC Personal Insight Questions (PIQs — pick 4 of 8)', 'Westwood Village location', 'Most applied-to university in the US', '130+ majors available'],
      campusCulture: ['True Bruin welcome week', '8-Clap victory cheer', 'Rivalry with USC', 'Bruin Walk social epicenter'],
      recentNews: ['New Grand Challenge research initiatives', 'Depression Grand Challenge expansion', 'Luskin Conference Center opening'],
      studentLife: ['1,000+ student organizations', 'Daily Bruin newspaper', '87 NCAA championships (most of any university)', 'Enormous intramural sports program'],
    },
    essayTip: 'Same UC PIQs as Berkeley. Choose different prompts than your Cal app if applying to both. Show what makes you distinctly a UCLA fit.',
  },
  {
    id: 'uva',
    name: 'University of Virginia',
    location: 'Charlottesville, VA',
    acceptanceRate: '16.3%',
    avgSAT: '1380-1530',
    avgGPA: '3.90',
    deadlines: { ea: 'Nov 1', rd: 'Jan 5' },
    prompts: [
      { id: 'uva-1', text: 'What about the University of Virginia interests you the most?', type: 'why_us', wordLimit: 100, required: true },
      { id: 'uva-2', text: 'UVA students paint messages on Beta Bridge when they want to share information with the community. If you could paint a message on Beta Bridge, what would it say?', type: 'creative', wordLimit: 50, required: true },
      { id: 'uva-3', text: 'UVA students are charged with operating under an honor system. Describe a time when you were trusted and how you responded.', type: 'challenge', wordLimit: 200, required: true },
    ],
    research: {
      uniquePrograms: ['Jefferson Scholars Foundation', 'Batten School of Leadership and Public Policy', 'McIntire School of Commerce (undergraduate)', 'Darden MBA access programs', 'Environmental Resilience Institute'],
      notableFeatures: ['Student self-governance tradition', 'Honor System (single sanction)', 'The Lawn and Academical Village (UNESCO World Heritage)', 'Echols Scholar program'],
      campusCulture: ['Lighting of the Lawn (holiday tradition)', 'Fourth-year Fifth celebration', 'Mr. Jefferson references', 'Cavalier athletics traditions'],
      recentNews: ['School of Data Science growth', 'Karsh Institute of Democracy launch', 'New STEM building complex'],
      studentLife: ['800+ student organizations', 'Cavalier Daily newspaper', 'CIO (Contracted Independent Organizations)', 'Greek life prominent'],
    },
    essayTip: 'UVA\'s Beta Bridge prompt is only 50 words — be witty and memorable. The "Why UVA" is 100 words — ultra-specific or don\'t bother.',
  },
  {
    id: 'tufts',
    name: 'Tufts University',
    location: 'Medford, MA',
    acceptanceRate: '9.5%',
    avgSAT: '1430-1540',
    avgGPA: '3.90',
    deadlines: { ed: 'Nov 1', ed2: 'Jan 4', rd: 'Jan 4' },
    prompts: [
      { id: 'tufts-1', text: 'Why Tufts? Which aspects of the university excite you? How will you contribute to the campus community?', type: 'why_us', wordLimit: 150, required: true },
      { id: 'tufts-2', text: 'Now we\'d like to know a little more about you. Please respond to one of the following prompts in 200-250 words: (Topics change yearly — typically creative, intellectual, or identity focused)', type: 'creative', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Fletcher School of Law and Diplomacy access', 'Tufts Medical School and Dental School', 'SMFA (School of the Museum of Fine Arts)', 'Friedman School of Nutrition', 'International Relations program'],
      notableFeatures: ['Active citizenship focus', 'Combined degree programs (5-year BA/MA)', 'Experimental College (ExCollege — student-taught courses)', 'Close to Boston and Cambridge'],
      campusCulture: ['Naked Quad Run', 'Matriculation ceremony', 'Jumbo the elephant mascot', 'Spring Fling weekend'],
      recentNews: ['Tufts Center for Engineering Education expansion', 'Civic life curriculum launch', 'New STEM research building'],
      studentLife: ['300+ student organizations', 'Tufts Daily newspaper', 'Strong arts and theater scene', 'Community service emphasis'],
    },
    essayTip: 'Tufts values active citizenship and quirky intellectualism. Their prompts tend to be creative — take risks. Don\'t write a conventional essay.',
  },
  {
    id: 'cmu',
    name: 'Carnegie Mellon University',
    location: 'Pittsburgh, PA',
    acceptanceRate: '11.1%',
    avgSAT: '1480-1560',
    avgGPA: '3.92',
    deadlines: { ed: 'Nov 1', rd: 'Jan 3' },
    prompts: [
      { id: 'cmu-1', text: 'Most students choose their intended major or area of study based on a passion or inspiration that is Search for to them. Please share your story.', type: 'future', wordLimit: 300, required: true },
      { id: 'cmu-2', text: 'Many students pursue college for a specific degree, career opportunity or personal goal. Whichever it may be, share your motivation for pursuing a college degree.', type: 'future', wordLimit: 300, required: true },
      { id: 'cmu-3', text: 'Consider your application as a whole. What do you personally want to emphasize about your application for the admission committee\'s consideration?', type: 'identity', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['School of Computer Science (top-ranked)', 'Robotics Institute', 'Entertainment Technology Center', 'Tepper School of Business', 'BXA Intercollege Degree Programs (Art + Engineering, etc.)'],
      notableFeatures: ['7 distinct schools/colleges', 'BXA intercollege programs (unique interdisciplinary)', 'Strong industry connections (tech companies recruit heavily)', 'Maker culture and fabrication labs'],
      campusCulture: ['Buggy races (Spring Carnival tradition)', 'Fence painting tradition', 'Carnegie Mellon Tartan pride', 'Spring Carnival and Mobot races'],
      recentNews: ['CMU AI research leads in robotics', 'New Scaife Hall engineering building', 'Expanded Block Center for Technology and Society'],
      studentLife: ['300+ student organizations', 'The Tartan newspaper', 'Activities Board events', 'Strong Greek life and cultural orgs'],
    },
    essayTip: 'CMU essays are school-specific. Research the exact program you\'re applying to — SCS, MCS, CIT, etc. Generic "I love CS" won\'t work.',
  },
  {
    id: 'boston_college',
    name: 'Boston College',
    location: 'Chestnut Hill, MA',
    acceptanceRate: '16%',
    avgSAT: '1400-1520',
    avgGPA: '3.89',
    deadlines: { ea: 'Nov 1', rd: 'Jan 2' },
    prompts: [
      { id: 'bc-1', text: 'Each year at University Convocation, our weights gather and celebrate the start of a new academic year. The President of the University typically provides a perspective on the coming year\'s opportunities and challenges. What do you think would be worthy of the conversation?', type: 'intellectual', wordLimit: 400, required: true },
    ],
    research: {
      uniquePrograms: ['Woods College of Advancing Studies', 'Carroll School of Management', 'Lynch School of Education', 'PULSE Program for Service Learning', 'Boston College Center for Corporate Citizenship'],
      notableFeatures: ['Jesuit education (magis — pursuit of excellence)', 'Core curriculum emphasizing philosophy and theology', 'Boston location with suburban campus', 'Strong pre-law and pre-med placement'],
      campusCulture: ['Marathon Monday (Boston Marathon passes through campus)', 'Eagle mascot and "For Boston" fight song', 'Mod culture (senior modular housing)', 'Football tailgating traditions'],
      recentNews: ['Schiller Institute for Integrated Science expansion', 'New Pine Manor campus acquisition', 'Enhanced financial aid programs'],
      studentLife: ['300+ student organizations', 'The Heights newspaper', 'Strong service and volunteering culture', 'Dance Marathon and charitable events'],
    },
    essayTip: 'BC\'s Jesuit identity matters. Show intellectual depth AND concern for others. The Convocation prompt wants you to think about big ideas.',
  },
  {
    id: 'unc',
    name: 'University of North Carolina at Chapel Hill',
    location: 'Chapel Hill, NC',
    acceptanceRate: '16.8%',
    avgSAT: '1350-1510',
    avgGPA: '3.88',
    deadlines: { ea: 'Oct 15', rd: 'Jan 15' },
    prompts: [
      { id: 'unc-1', text: 'Describe a peer who is making a difference in your school or community. What actions has that peer taken? How has their contribution inspired you?', type: 'community', wordLimit: 250, required: true },
      { id: 'unc-2', text: 'If you could change one thing to better your community, what would it be? Please explain.', type: 'community', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Kenan-Flagler Business School', 'Hussman School of Journalism', 'Gillings School of Global Public Health', 'Robertson Scholars (Duke-UNC exchange)', 'APPLES Service-Learning'],
      notableFeatures: ['First public university in the US', 'Carolina Covenant (loan-free for low-income students)', 'First-Year Seminars program', 'Strong study abroad participation'],
      campusCulture: ['Tar Heel pride', 'Basketball culture (Dean Smith Center)', 'Franklin Street celebrations', 'Old Well tradition (first drink of the year)'],
      recentNews: ['New medical research facility', 'School of Data Science and Society launch', 'Campus-wide sustainability initiative'],
      studentLife: ['800+ student organizations', 'Daily Tar Heel newspaper', 'Carolina Union activities', 'Strong Greek life'],
    },
    essayTip: 'UNC\'s prompts focus on community impact. Don\'t make it about you — make it about others and what you learned from them.',
  },
  {
    id: 'northeastern',
    name: 'Northeastern University',
    location: 'Boston, MA',
    acceptanceRate: '5.6%',
    avgSAT: '1430-1540',
    avgGPA: '3.91',
    deadlines: { ea: 'Nov 1', ed: 'Nov 1', rd: 'Jan 1' },
    prompts: [
      { id: 'ne-1', text: 'Northeastern University embraces the idea that learning extends far beyond the classroom. Our co-op program provides students with the opportunity to integrate real-world experience into their academic careers. How do you envision this model helping you explore your interests and achieve your goals?', type: 'future', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Co-op Program (6-month paid work experiences)', 'Global Network of campuses', 'Combined majors program', 'PlusOne Accelerated Master\'s', 'Experiential PhD'],
      notableFeatures: ['Co-op model (alternate semesters of work and study)', '3,000+ co-op employer partners', 'Global experience offices (London, Shanghai, etc.)', 'Strong career outcomes'],
      campusCulture: ['Husky pride', 'Light the Night pep rally', 'Co-op culture defines the social scene', 'Boston city integration'],
      recentNews: ['New EXP building for experiential learning', 'Mills College merger', 'Oakland campus expansion'],
      studentLife: ['400+ student organizations', 'Huntington News', 'Student Government Association', 'NU Hacks hackathon'],
    },
    essayTip: 'Northeastern IS the co-op. Your essay must directly address how co-op fits your career plan. Be specific about companies or industries.',
  },
  {
    id: 'wisconsin',
    name: 'University of Wisconsin-Madison',
    location: 'Madison, WI',
    acceptanceRate: '49%',
    avgSAT: '1310-1480',
    avgGPA: '3.85',
    deadlines: { ea: 'Nov 1', rd: 'Feb 1' },
    prompts: [
      { id: 'wisc-1', text: 'Tell us about your academic and personal interests and how they connect to your desired major and/or field(s) of study at UW-Madison.', type: 'future', wordLimit: 650, required: true },
      { id: 'wisc-2', text: 'Tell us about something you\'ve done — academically or personally — and what you\'ve learned from it. Was there a problem that you wanted to fix in your school or community; did you push yourself outside of your comfort zone?', type: 'challenge', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['Wisconsin Institutes for Discovery', 'La Follette School of Public Affairs', 'Wisconsin School of Business (undergraduate)', 'University Research Park', 'First Wave Hip Hop and Urban Arts Learning Community'],
      notableFeatures: ['Big Ten research powerhouse', 'Madison isthmus location (between two lakes)', '200+ undergraduate majors', 'Strong study abroad programs'],
      campusCulture: ['Jump Around at Camp Randall (football tradition)', 'State Street food and culture', 'Terrace views at Memorial Union', 'Badger Game Day traditions'],
      recentNews: ['New Chemistry Building opening', 'Data science major expansion', 'Waisman Center neuroscience research growth'],
      studentLife: ['900+ student organizations', 'Daily Cardinal and Badger Herald papers', 'Hoofers outdoor recreation club', 'Union South and Memorial Union hub'],
    },
    essayTip: 'Wisconsin gives 650 words for the academic essay — go deep on why their specific department fits your goals. Mention labs, professors, or programs.',
  },
  {
    id: 'purdue',
    name: 'Purdue University',
    location: 'West Lafayette, IN',
    acceptanceRate: '53%',
    avgSAT: '1210-1430',
    avgGPA: '3.75',
    deadlines: { ea: 'Nov 1', rd: 'Jan 15' },
    prompts: [
      { id: 'purd-1', text: 'How will your intended major help you achieve your long-term personal or professional goals? If undecided, share subjects or fields that excite you and why.', type: 'future', wordLimit: 250, required: true },
      { id: 'purd-2', text: 'Briefly discuss your reasons for pursuing the major you have selected.', type: 'future', wordLimit: 100, required: true },
    ],
    research: {
      uniquePrograms: ['Purdue Polytechnic Institute', 'Krach Institute for Tech Ethics', 'Purdue Space Program (student-run)', 'Discovery Park research campus', 'Cornerstone Engineering first-year experience'],
      notableFeatures: ['Engineering (#4 nationally)', 'Tuition freeze since 2012', 'Purdue Global (online university)', 'Strong aerospace and aviation program'],
      campusCulture: ['Boilermaker Special train mascot', 'Grand Prix go-kart race', 'Purdue All-American Marching Band', 'Breakfast Club game day tradition'],
      recentNews: ['Purdue-Rolls Royce partnership for hypersonics', 'Semiconductor research hub', 'New engineering buildings'],
      studentLife: ['1,000+ student organizations', 'Purdue Exponent newspaper', 'Co-rec sports complex', 'Boiler Gold Rush orientation'],
    },
    essayTip: 'Purdue is engineering and STEM heavy. Be direct about why your major and why Purdue specifically — they value practicality over poetry.',
  },
  {
    id: 'texas_austin',
    name: 'University of Texas at Austin',
    location: 'Austin, TX',
    acceptanceRate: '29%',
    avgSAT: '1310-1500',
    avgGPA: '3.85',
    deadlines: { rd: 'Dec 1' },
    prompts: [
      { id: 'ut-1', text: 'Tell us your story. What unique opportunities or challenges have you experienced throughout your high school career that have shaped who you are today?', type: 'identity', wordLimit: 650, required: true },
      { id: 'ut-2', text: 'Describe how your experiences, perspectives, talents, and/or your involvement in leadership activities will help you make an impact both in and out of the classroom while enrolled at UT Austin.', type: 'community', wordLimit: 300, required: true },
      { id: 'ut-3', text: 'The core purpose of The University of Texas at Austin is, "To Transform Lives for the Benefit of Society." Please share how you believe your experience at UT Austin will prepare you to "Transform Lives for the Benefit of Society."', type: 'future', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['McCombs School of Business', 'Cockrell School of Engineering', 'Moody College of Communication', 'Dell Medical School partnerships', 'Texas Venture Labs'],
      notableFeatures: ['Austin tech ecosystem (Silicon Hills)', 'Automatic admission for top 6% of Texas high school classes', 'Massive research university ($700M+ annual research)', 'Honors programs across colleges'],
      campusCulture: ['Hook \'em Horns hand sign', 'Bevo (longhorn steer mascot)', 'UT Tower lighting for achievements', 'Red River Rivalry (Oklahoma)'],
      recentNews: ['New Engineering Education and Research Center', 'AI institute expansion', 'Campus master plan for growth'],
      studentLife: ['1,000+ student organizations', 'The Daily Texan newspaper', 'Longhorn Band', 'Sixth Street and Austin music scene'],
    },
    essayTip: 'UT-Austin\'s Apply Texas essays focus on story and impact. Be personal and show how you\'ll use UT\'s resources to create change.',
  },
  {
    id: 'uf',
    name: 'University of Florida',
    location: 'Gainesville, FL',
    acceptanceRate: '23%',
    avgSAT: '1330-1480',
    avgGPA: '3.86',
    deadlines: { rd: 'Nov 1' },
    prompts: [
      { id: 'uf-1', text: 'Please provide more details on your most meaningful commitment outside of the classroom while in high school and why it was meaningful to you.', type: 'activity', wordLimit: 250, required: true },
      { id: 'uf-2', text: 'UF is committed to building a community that embraces the variety of human experiences. What about your background, experiences, or goals would help you contribute to this commitment?', type: 'diversity', wordLimit: 250, required: true },
    ],
    research: {
      uniquePrograms: ['Innovation Academy (spring-summer enrollment model)', 'Warrington College of Business', 'Herbert Wertheim College of Engineering', 'UF Health and Shands Hospital', 'AI initiative ($100M+ investment)'],
      notableFeatures: ['Top 5 public university', 'Pace Yourself (self-paced online options)', 'Honors Program and Innovation Academy', 'UF Online (top-ranked online bachelor\'s)'],
      campusCulture: ['Gator Chomp cheer', 'The Swamp (Ben Hill Griffin Stadium)', 'Mr. Two Bits traditions', 'Gator Growl homecoming'],
      recentNews: ['Malachowsky Hall for Data Science', 'AI-across-the-curriculum initiative', 'New computer science building'],
      studentLife: ['1,000+ student organizations', 'The Independent Florida Alligator', 'Reitz Union student center', 'Strong Greek life'],
    },
    essayTip: 'UF cares about meaningful commitment — don\'t just describe an activity, show depth and personal growth. They want to see sustained dedication.',
  },
  {
    id: 'virginia_tech',
    name: 'Virginia Tech',
    location: 'Blacksburg, VA',
    acceptanceRate: '57%',
    avgSAT: '1240-1410',
    avgGPA: '3.80',
    deadlines: { ea: 'Nov 1', rd: 'Jan 15' },
    prompts: [
      { id: 'vt-1', text: 'Virginia Tech\'s motto is "Ut Prosim" (That I May Serve). Share a time when you have contributed to a group, organization, or community. How did this experience shape your identity and what did you learn about yourself?', type: 'community', wordLimit: 120, required: true },
      { id: 'vt-2', text: 'Share a time when you were most proud to be you. What lesson did you take from this experience?', type: 'identity', wordLimit: 120, required: true },
      { id: 'vt-3', text: 'Virginia Tech strives to expand knowledge, broaden perspectives, and foster a spirit of inclusion. Share a perspective, idea, or experience that has expanded your view of the world.', type: 'diversity', wordLimit: 120, required: true },
      { id: 'vt-4', text: 'Describe a goal you have set and the steps you will take to achieve it. What made you set this goal for yourself?', type: 'future', wordLimit: 120, required: true },
    ],
    research: {
      uniquePrograms: ['College of Engineering (#1 in VA)', 'Virginia Tech Transportation Institute', 'Fralin Biomedical Research Institute', 'Corps of Cadets (one of few senior military colleges)', 'Innovation Campus in Northern VA'],
      notableFeatures: ['Ut Prosim (That I May Serve) motto embedded in culture', 'Hands-on, experiential learning focus', 'VT ENGAGE service-learning', 'Strong co-op and internship programs'],
      campusCulture: ['Hokie Bird mascot', 'Enter Sandman football entrance', 'Skipper (cannon) at football games', 'Ring Dance tradition'],
      recentNews: ['Innovation Campus Phase 2 expansion', 'Amazon HQ2 partnership', 'New data analytics programs'],
      studentLife: ['700+ student organizations', 'Collegiate Times newspaper', 'Gobblerfest activities fair', 'Hokie Camp orientation'],
    },
    essayTip: 'Virginia Tech\'s prompts are only 120 words each — ultra-concise. Focus on ONE specific moment per prompt. "Ut Prosim" (service) is core to their identity.',
  },
  {
    id: 'williams',
    name: 'Williams College',
    location: 'Williamstown, MA',
    acceptanceRate: '8.5%',
    avgSAT: '1460-1550',
    avgGPA: '3.94',
    deadlines: { ed: 'Nov 15', rd: 'Jan 8' },
    prompts: [
      { id: 'wil-1', text: 'We\'d love to hear from every applicant. Please respond to one of the following prompts in 300 words or fewer. (Options change yearly — typically focus on an experience, idea, or part of your identity)', type: 'identity', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['Tutorial system (Oxford-style 1-on-1 learning)', 'Williams-Exeter Programme at Oxford', 'Center for Environmental Studies', 'Williams College Museum of Art (WCMA)', 'Exploring the Liberal Arts (first-year program)'],
      notableFeatures: ['#1 liberal arts college (consistently)', '7:1 student-faculty ratio', 'Tutorial system unique in the US', 'Winter Study (one-month intensive January term)'],
      campusCulture: ['Mountain Day (surprise day off for hiking)', 'Trivia Night tradition', 'Purple and gold Eph pride', 'Close-knit 2,000-student community'],
      recentNews: ['New science center renovation', 'Expanded financial aid (fully need-blind)', 'Sustainability initiatives'],
      studentLife: ['180+ student organizations', 'Williams Record newspaper', 'Strong club sports', 'Entry system (first-year housing groups)'],
    },
    essayTip: 'Williams is a liberal arts college — show intellectual range, not specialization. The tutorial system is a unique hook worth referencing.',
  },
  {
    id: 'amherst',
    name: 'Amherst College',
    location: 'Amherst, MA',
    acceptanceRate: '7.3%',
    avgSAT: '1470-1550',
    avgGPA: '3.94',
    deadlines: { ed: 'Nov 1', rd: 'Jan 3' },
    prompts: [
      { id: 'amh-1', text: 'Please briefly elaborate on an extracurricular activity or work experience that was particularly meaningful to you.', type: 'activity', wordLimit: 300, required: true },
      { id: 'amh-2', text: 'Please respond to one of the following quotations in an essay of not more than 300 words. (Amherst provides intellectual quotations to respond to — changes yearly)', type: 'intellectual', wordLimit: 300, required: true },
    ],
    research: {
      uniquePrograms: ['Open Curriculum (no distribution requirements)', 'Five College Consortium (UMass, Smith, Hampshire, Mt. Holyoke)', 'Center for Humanistic Inquiry', 'Loeb Center for Career Exploration', 'Amherst College Press'],
      notableFeatures: ['100% need-blind with need-met admissions', 'Open curriculum — complete academic freedom', 'Five College exchange (take classes at 5 schools)', 'Small (1,900 students) with research resources'],
      campusCulture: ['Mammoth mascot (Lord Jeff retired)', 'Singing on the steps', 'Amherst-Williams rivalry', 'First-year orientation outdoors trips'],
      recentNews: ['New Science Center completion', 'Expanded Amherst LEAP program', 'Record diversity in admissions'],
      studentLife: ['150+ student organizations', 'Amherst Student newspaper', 'Social dorms (no Greek life)', 'Val (Valentine dining hall) as social hub'],
    },
    essayTip: 'Amherst gives you a quote to respond to — this is an intellectual exercise. Show how you think, not just what you think. Engage with the ideas.',
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

  // 1. Exact name match
  const exact = SCHOOLS.find(s => s.name.toLowerCase() === lower);
  if (exact) return exact;

  // 2. Name contains input or input contains name (full name, not first word)
  const containsMatch = SCHOOLS.find(s =>
    s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())
  );
  if (containsMatch) return containsMatch;

  // 3. ID match
  const idMatch = SCHOOLS.find(s =>
    s.id === lower.replace(/\s+/g, '_') || s.id === lower.replace(/\s+/g, '')
  );
  if (idMatch) return idMatch;

  // 4. Fuzzy: match on significant keywords (skip common words like "university", "of", "the")
  const skipWords = new Set(['university', 'of', 'the', 'at', 'in', 'college', 'institute', 'school']);
  const inputWords = lower.split(/\s+/).filter(w => w.length > 2 && !skipWords.has(w));
  if (inputWords.length > 0) {
    return SCHOOLS.find(s => {
      const schoolLower = s.name.toLowerCase();
      return inputWords.every(w => schoolLower.includes(w));
    });
  }

  return undefined;
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
    const incompleteTasks = (school.tasks || []).filter(t => !t.done);

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
  const totalTasks = schools.reduce((s, sch) => s + (sch.tasks || []).length, 0);
  const doneTasks = schools.reduce((s, sch) => s + (sch.tasks || []).filter(t => t.done).length, 0);

  return {
    critical: timeline.filter(t => t.priority === 'critical'),
    thisWeek: timeline.filter(t => t.daysUntil >= 0 && t.daysUntil <= 7 && t.priority !== 'critical'),
    upcoming: timeline.filter(t => t.daysUntil > 7 && t.daysUntil <= 30).slice(0, 8),
    onTrack: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
    totalSchools: schools.length,
    submittedSchools: schools.filter(s => ['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(s.status)).length,
  };
}
