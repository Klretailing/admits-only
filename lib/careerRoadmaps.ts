import { colleges } from './colleges';
import { BASE_OVERVIEWS } from './careerOverviewsBase';

/* ──────────────────────── TYPES ──────────────────────── */

export interface Milestone {
  id: string;
  label: string;
  type: 'education' | 'training' | 'early' | 'mid' | 'senior';
  durationYears: number;
  requirements: string[];
  salaryRange: [number, number];
  matchingStrengths: string[];
}

export interface CareerPath {
  id: string;
  name: string;
  peakSalary: number;
  milestones: Milestone[];
}

export interface Major {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  paths: CareerPath[];
}

/** Rich, in-depth context for a single career path (keyed by path id in
    PATH_OVERVIEWS). Optional per path; the UI renders whatever is present. */
export interface CareerOverview {
  summary: string;
  keySkills: string[];
  outlook: string;
  entryTips: string[];
  licenses: string[];
  topEmployers: string[];
  workStyle: string;
  alsoConsider: string[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: { label: string; weights: Record<string, number> }[];
}

export interface QuizResult {
  majorId: string;
  score: number;
  reasoning: string;
}

/* ──────────────────────── CONFIGS ──────────────────────── */

export const categoryConfig: Record<string, { bg: string; text: string; border: string }> = {
  stem:     { bg: 'from-indigo-500 to-blue-500',   text: 'text-indigo-400', border: 'border-indigo-500/30' },
  health:   { bg: 'from-emerald-500 to-teal-500',  text: 'text-emerald-400', border: 'border-emerald-500/30' },
  business: { bg: 'from-amber-500 to-orange-500',   text: 'text-amber-400',  border: 'border-amber-500/30' },
  social:   { bg: 'from-purple-500 to-fuchsia-500', text: 'text-purple-400', border: 'border-purple-500/30' },
  creative: { bg: 'from-rose-500 to-pink-500',      text: 'text-rose-400',   border: 'border-rose-500/30' },
  aviation: { bg: 'from-sky-500 to-cyan-500',       text: 'text-sky-400',    border: 'border-sky-500/30' },
};

export const milestoneColor: Record<string, string> = {
  education: 'bg-indigo-500',
  training:  'bg-purple-500',
  early:     'bg-emerald-500',
  mid:       'bg-amber-500',
  senior:    'bg-rose-500',
};

/* ──────────────────────── COLLEGE MATCHING ──────────────────────── */

const normalizeStrength = (s: string) => s.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();

const normalizedColleges = colleges.map(c => ({
  college: c,
  norms: c.strengths.map(normalizeStrength),
}));

export function getRecommendedColleges(strengths: string[], limit = 3) {
  if (!strengths.length) return [];
  const needSet = strengths.map(normalizeStrength);

  const scored = normalizedColleges.map(({ college, norms }) => {
    let score = 0;
    for (const ns of needSet) {
      for (const cn of norms) {
        if (cn.includes(ns) || ns.includes(cn)) { score++; break; }
      }
    }
    return { college, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.college.acceptanceRate - b.college.acceptanceRate)
    .slice(0, limit)
    .map(s => s.college);
}

/* ──────────────────────── MAJORS (1-5) ──────────────────────── */

export const MAJORS: Major[] = [
  {
    id: 'cs',
    name: 'Computer Science',
    description: 'Design software, build AI systems, and solve complex computational problems.',
    icon: '💻',
    category: 'stem',
    paths: [
      {
        id: 'cs-swe',
        name: 'Software Engineer',
        peakSalary: 300000,
        milestones: [
          { id: 'cs-swe-1', label: "Bachelor's in CS", type: 'education', durationYears: 4, requirements: ['Data Structures & Algorithms', 'Software Engineering', 'Calculus I & II'], salaryRange: [0, 0], matchingStrengths: ['CS', 'Engineering'] },
          { id: 'cs-swe-2', label: 'Junior Developer', type: 'early', durationYears: 2, requirements: ['Build portfolio projects', 'Internship experience', 'Learn a framework (React, Django, etc.)'], salaryRange: [75000, 105000], matchingStrengths: [] },
          { id: 'cs-swe-3', label: 'Mid-Level Engineer', type: 'mid', durationYears: 3, requirements: ['System design skills', 'Mentorship experience', 'Production-scale projects'], salaryRange: [110000, 160000], matchingStrengths: [] },
          { id: 'cs-swe-4', label: 'Senior / Staff Engineer', type: 'senior', durationYears: 5, requirements: ['Architecture leadership', 'Cross-team influence', 'Technical strategy'], salaryRange: [160000, 300000], matchingStrengths: [] },
        ],
      },
      {
        id: 'cs-ml',
        name: 'AI / ML Engineer',
        peakSalary: 350000,
        milestones: [
          { id: 'cs-ml-1', label: "Bachelor's in CS / Math", type: 'education', durationYears: 4, requirements: ['Linear Algebra', 'Probability & Statistics', 'Machine Learning coursework'], salaryRange: [0, 0], matchingStrengths: ['CS', 'Math', 'AI'] },
          { id: 'cs-ml-2', label: "Master's or Research", type: 'education', durationYears: 2, requirements: ['ML research project', 'Publication or thesis', 'Deep Learning specialization'], salaryRange: [0, 0], matchingStrengths: ['CS', 'AI', 'Math'] },
          { id: 'cs-ml-3', label: 'ML Engineer', type: 'early', durationYears: 3, requirements: ['Model training pipelines', 'MLOps & deployment', 'Business problem framing'], salaryRange: [120000, 180000], matchingStrengths: [] },
          { id: 'cs-ml-4', label: 'Senior ML / Research Scientist', type: 'senior', durationYears: 5, requirements: ['Novel model architectures', 'Team or lab leadership', 'Conference publications'], salaryRange: [180000, 350000], matchingStrengths: [] },
        ],
      },
      {
        id: 'cs-pm',
        name: 'Product Manager (Tech)',
        peakSalary: 300000,
        milestones: [
          { id: 'cs-pm-1', label: "Bachelor's in CS / Business", type: 'education', durationYears: 4, requirements: ['Technical fundamentals', 'HCI or UX elective', 'Business or econ minor recommended'], salaryRange: [0, 0], matchingStrengths: ['CS', 'Business'] },
          { id: 'cs-pm-2', label: 'Associate PM', type: 'early', durationYears: 2, requirements: ['APM program or internship', 'User research skills', 'Agile methodology'], salaryRange: [85000, 120000], matchingStrengths: [] },
          { id: 'cs-pm-3', label: 'Product Manager', type: 'mid', durationYears: 3, requirements: ['Own a product area', 'Data-driven decision making', 'Stakeholder management'], salaryRange: [130000, 180000], matchingStrengths: [] },
          { id: 'cs-pm-4', label: 'Director of Product', type: 'senior', durationYears: 5, requirements: ['Multi-product strategy', 'P&L ownership', 'Executive communication'], salaryRange: [180000, 300000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'engineering',
    name: 'Mechanical Engineering',
    description: 'Apply physics and materials science to design, build, and optimize machines and systems.',
    icon: '⚙️',
    category: 'stem',
    paths: [
      {
        id: 'eng-design',
        name: 'Design Engineer',
        peakSalary: 180000,
        milestones: [
          { id: 'eng-d-1', label: "Bachelor's in ME", type: 'education', durationYears: 4, requirements: ['Thermodynamics', 'Solid Mechanics', 'CAD / SolidWorks'], salaryRange: [0, 0], matchingStrengths: ['Engineering', 'Physics'] },
          { id: 'eng-d-2', label: 'Junior Design Engineer', type: 'early', durationYears: 2, requirements: ['FEA / simulation tools', 'GD&T proficiency', 'Prototyping experience'], salaryRange: [65000, 85000], matchingStrengths: [] },
          { id: 'eng-d-3', label: 'Senior Design Engineer', type: 'mid', durationYears: 4, requirements: ['Lead product design cycles', 'DFM / DFA expertise', 'Cross-functional collaboration'], salaryRange: [90000, 130000], matchingStrengths: [] },
          { id: 'eng-d-4', label: 'Principal Engineer', type: 'senior', durationYears: 5, requirements: ['Patent portfolio', 'Technical direction for product line', 'Mentorship'], salaryRange: [130000, 180000], matchingStrengths: [] },
        ],
      },
      {
        id: 'eng-aero',
        name: 'Aerospace Engineer',
        peakSalary: 180000,
        milestones: [
          { id: 'eng-a-1', label: "Bachelor's in ME / Aero", type: 'education', durationYears: 4, requirements: ['Aerodynamics', 'Control Systems', 'Propulsion'], salaryRange: [0, 0], matchingStrengths: ['Engineering', 'Physics', 'Aerospace'] },
          { id: 'eng-a-2', label: "Master's in Aerospace", type: 'education', durationYears: 2, requirements: ['CFD specialization', 'Research thesis', 'Security clearance (for defense)'], salaryRange: [0, 0], matchingStrengths: ['Engineering', 'Aerospace'] },
          { id: 'eng-a-3', label: 'Aerospace Engineer', type: 'early', durationYears: 3, requirements: ['Systems-level design', 'Testing & qualification', 'FAA / MIL-STD compliance'], salaryRange: [85000, 120000], matchingStrengths: [] },
          { id: 'eng-a-4', label: 'Lead Systems Engineer', type: 'senior', durationYears: 5, requirements: ['Program-level technical lead', 'Proposal authoring', 'Multi-discipline integration'], salaryRange: [130000, 180000], matchingStrengths: [] },
        ],
      },
      {
        id: 'eng-mfg',
        name: 'Manufacturing / Operations',
        peakSalary: 250000,
        milestones: [
          { id: 'eng-m-1', label: "Bachelor's in ME / IE", type: 'education', durationYears: 4, requirements: ['Manufacturing Processes', 'Lean / Six Sigma intro', 'Statistics'], salaryRange: [0, 0], matchingStrengths: ['Engineering'] },
          { id: 'eng-m-2', label: 'Process Engineer', type: 'early', durationYears: 2, requirements: ['Root cause analysis', 'SPC implementation', 'Line layout optimization'], salaryRange: [65000, 85000], matchingStrengths: [] },
          { id: 'eng-m-3', label: 'Operations Manager', type: 'mid', durationYears: 4, requirements: ['Team leadership (20+)', 'Capital project budgeting', 'Lean transformation'], salaryRange: [95000, 135000], matchingStrengths: [] },
          { id: 'eng-m-4', label: 'VP of Operations', type: 'senior', durationYears: 6, requirements: ['Multi-plant oversight', 'Supply chain strategy', 'P&L responsibility'], salaryRange: [150000, 250000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'business',
    name: 'Business Administration',
    description: 'Lead organizations, manage teams, and drive strategic growth across industries.',
    icon: '📊',
    category: 'business',
    paths: [
      {
        id: 'biz-consulting',
        name: 'Management Consultant',
        peakSalary: 700000,
        milestones: [
          { id: 'biz-c-1', label: "Bachelor's in Business / Econ", type: 'education', durationYears: 4, requirements: ['Financial Accounting', 'Strategy', 'Statistics'], salaryRange: [0, 0], matchingStrengths: ['Business', 'Economics'] },
          { id: 'biz-c-2', label: 'Analyst', type: 'early', durationYears: 2, requirements: ['Case interview prep', 'Excel & PowerPoint mastery', 'Client-facing communication'], salaryRange: [75000, 100000], matchingStrengths: [] },
          { id: 'biz-c-3', label: 'MBA Program', type: 'education', durationYears: 2, requirements: ['GMAT / GRE', 'Leadership experience', 'Strong undergraduate GPA'], salaryRange: [0, 0], matchingStrengths: ['Business'] },
          { id: 'biz-c-4', label: 'Engagement Manager', type: 'mid', durationYears: 3, requirements: ['Lead project workstreams', 'Client relationship management', 'Team development'], salaryRange: [150000, 220000], matchingStrengths: [] },
          { id: 'biz-c-5', label: 'Partner', type: 'senior', durationYears: 6, requirements: ['Business development', 'Practice area leadership', 'Multi-million dollar engagements'], salaryRange: [300000, 700000], matchingStrengths: [] },
        ],
      },
      {
        id: 'biz-finance',
        name: 'Investment Banking / Finance',
        peakSalary: 600000,
        milestones: [
          { id: 'biz-f-1', label: "Bachelor's in Finance / Business", type: 'education', durationYears: 4, requirements: ['Corporate Finance', 'Financial Modeling', 'Accounting'], salaryRange: [0, 0], matchingStrengths: ['Business', 'Finance', 'Economics'] },
          { id: 'biz-f-2', label: 'IB Analyst', type: 'early', durationYears: 2, requirements: ['Financial modeling', 'Pitch book creation', 'Due diligence support'], salaryRange: [100000, 150000], matchingStrengths: [] },
          { id: 'biz-f-3', label: 'Associate', type: 'mid', durationYears: 3, requirements: ['Deal execution', 'Client management', 'MBA often expected'], salaryRange: [150000, 250000], matchingStrengths: [] },
          { id: 'biz-f-4', label: 'VP / Director', type: 'senior', durationYears: 5, requirements: ['Originate deals', 'Sector expertise', 'Team leadership'], salaryRange: [300000, 600000], matchingStrengths: [] },
        ],
      },
      {
        id: 'biz-entrepreneur',
        name: 'Entrepreneurship',
        peakSalary: 1000000,
        milestones: [
          { id: 'biz-e-1', label: "Bachelor's in Business / Any", type: 'education', durationYears: 4, requirements: ['Entrepreneurship courses', 'Accounting basics', 'Marketing fundamentals'], salaryRange: [0, 0], matchingStrengths: ['Business'] },
          { id: 'biz-e-2', label: 'Early-Stage Founder', type: 'early', durationYears: 2, requirements: ['Validate product-market fit', 'Build MVP', 'Seed fundraising or bootstrapping'], salaryRange: [0, 60000], matchingStrengths: [] },
          { id: 'biz-e-3', label: 'Growth-Stage CEO', type: 'mid', durationYears: 3, requirements: ['Hire & manage a team', 'Series A/B fundraising', 'Revenue growth strategy'], salaryRange: [80000, 200000], matchingStrengths: [] },
          { id: 'biz-e-4', label: 'Scaled Founder / Exit', type: 'senior', durationYears: 5, requirements: ['Board governance', 'M&A or IPO preparation', 'Industry thought leadership'], salaryRange: [200000, 1000000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'biology',
    name: 'Biology / Pre-Med',
    description: 'Study living systems and prepare for careers in medicine, research, or biotechnology.',
    icon: '🧬',
    category: 'health',
    paths: [
      {
        id: 'bio-md',
        name: 'Physician (MD)',
        peakSalary: 450000,
        milestones: [
          { id: 'bio-md-1', label: "Bachelor's in Biology", type: 'education', durationYears: 4, requirements: ['Organic Chemistry', 'Biochemistry', 'Physics I & II', 'MCAT preparation'], salaryRange: [0, 0], matchingStrengths: ['Biology', 'Medicine', 'Pre-Med'] },
          { id: 'bio-md-2', label: 'Medical School (MD)', type: 'education', durationYears: 4, requirements: ['Clinical rotations', 'USMLE Step 1 & 2', 'Research elective'], salaryRange: [0, 0], matchingStrengths: ['Medicine'] },
          { id: 'bio-md-3', label: 'Residency', type: 'training', durationYears: 4, requirements: ['Specialty training', 'Board certification prep', '80-hr work weeks'], salaryRange: [58000, 75000], matchingStrengths: [] },
          { id: 'bio-md-4', label: 'Attending Physician', type: 'senior', durationYears: 10, requirements: ['Board certified', 'Hospital or private practice', 'CME requirements'], salaryRange: [220000, 450000], matchingStrengths: [] },
        ],
      },
      {
        id: 'bio-research',
        name: 'Biomedical Researcher',
        peakSalary: 160000,
        milestones: [
          { id: 'bio-r-1', label: "Bachelor's in Biology / Biochem", type: 'education', durationYears: 4, requirements: ['Research experience', 'Molecular Biology', 'Statistics'], salaryRange: [0, 0], matchingStrengths: ['Biology', 'Biomedical Engineering'] },
          { id: 'bio-r-2', label: 'PhD Program', type: 'education', durationYears: 5, requirements: ['Dissertation research', 'Publish 2-3 papers', 'Teaching assistantship'], salaryRange: [30000, 38000], matchingStrengths: ['Biology'] },
          { id: 'bio-r-3', label: 'Postdoctoral Fellow', type: 'training', durationYears: 3, requirements: ['Independent research project', 'Grant writing', 'Conference presentations'], salaryRange: [55000, 70000], matchingStrengths: [] },
          { id: 'bio-r-4', label: 'Principal Investigator', type: 'senior', durationYears: 8, requirements: ['Run a research lab', 'Secure R01 / NIH funding', 'Mentor grad students'], salaryRange: [90000, 160000], matchingStrengths: [] },
        ],
      },
      {
        id: 'bio-biotech',
        name: 'Biotech / Pharma',
        peakSalary: 250000,
        milestones: [
          { id: 'bio-bt-1', label: "Bachelor's in Biology / Chem", type: 'education', durationYears: 4, requirements: ['Cell Biology', 'Genetics', 'Lab techniques'], salaryRange: [0, 0], matchingStrengths: ['Biology', 'Chemistry'] },
          { id: 'bio-bt-2', label: 'Research Associate', type: 'early', durationYears: 2, requirements: ['GLP compliance', 'Assay development', 'Lab notebook documentation'], salaryRange: [55000, 75000], matchingStrengths: [] },
          { id: 'bio-bt-3', label: 'Senior Scientist', type: 'mid', durationYears: 4, requirements: ['Lead a project team', 'IND-enabling studies', 'Patent contributions'], salaryRange: [90000, 140000], matchingStrengths: [] },
          { id: 'bio-bt-4', label: 'Director of R&D', type: 'senior', durationYears: 5, requirements: ['Pipeline strategy', 'Cross-functional leadership', 'Regulatory interactions'], salaryRange: [160000, 250000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'nursing',
    name: 'Nursing',
    description: 'Provide direct patient care and advance into specialized clinical or leadership roles.',
    icon: '🏥',
    category: 'health',
    paths: [
      {
        id: 'nurs-clinical',
        name: 'Clinical Nurse → NP',
        peakSalary: 145000,
        milestones: [
          { id: 'nurs-c-1', label: 'BSN (Nursing Degree)', type: 'education', durationYears: 4, requirements: ['Anatomy & Physiology', 'Clinical rotations', 'NCLEX-RN exam'], salaryRange: [0, 0], matchingStrengths: ['Nursing', 'Medicine', 'Health Sciences'] },
          { id: 'nurs-c-2', label: 'Staff RN', type: 'early', durationYears: 2, requirements: ['Hospital or clinic experience', 'Specialty certification', 'BLS / ACLS'], salaryRange: [60000, 85000], matchingStrengths: [] },
          { id: 'nurs-c-3', label: 'MSN / Nurse Practitioner', type: 'education', durationYears: 2, requirements: ['Advanced pharmacology', 'Clinical hours (500+)', 'National certification'], salaryRange: [0, 0], matchingStrengths: ['Nursing'] },
          { id: 'nurs-c-4', label: 'Nurse Practitioner', type: 'senior', durationYears: 8, requirements: ['Independent or collaborative practice', 'Prescriptive authority', 'Patient panel management'], salaryRange: [105000, 145000], matchingStrengths: [] },
        ],
      },
      {
        id: 'nurs-admin',
        name: 'Nurse Administrator',
        peakSalary: 220000,
        milestones: [
          { id: 'nurs-a-1', label: 'BSN (Nursing Degree)', type: 'education', durationYears: 4, requirements: ['Nursing fundamentals', 'Leadership elective', 'Clinical hours'], salaryRange: [0, 0], matchingStrengths: ['Nursing', 'Health Sciences'] },
          { id: 'nurs-a-2', label: 'Charge Nurse', type: 'early', durationYears: 3, requirements: ['Unit management', 'Staff scheduling', 'Quality improvement projects'], salaryRange: [70000, 90000], matchingStrengths: [] },
          { id: 'nurs-a-3', label: 'Nurse Manager (MSN)', type: 'mid', durationYears: 4, requirements: ['MSN in Nursing Leadership', 'Budget management', 'Regulatory compliance'], salaryRange: [90000, 120000], matchingStrengths: [] },
          { id: 'nurs-a-4', label: 'Chief Nursing Officer', type: 'senior', durationYears: 6, requirements: ['Hospital-wide nursing strategy', 'DNP or MBA preferred', 'Board-level reporting'], salaryRange: [140000, 220000], matchingStrengths: [] },
        ],
      },
      {
        id: 'nurs-crna',
        name: 'Nurse Anesthetist (CRNA)',
        peakSalary: 260000,
        milestones: [
          { id: 'nurs-cr-1', label: 'BSN (Nursing Degree)', type: 'education', durationYears: 4, requirements: ['Strong science foundation', 'Critical care elective', 'NCLEX-RN'], salaryRange: [0, 0], matchingStrengths: ['Nursing', 'Medicine'] },
          { id: 'nurs-cr-2', label: 'ICU Nurse (1-2 yrs required)', type: 'training', durationYears: 2, requirements: ['Critical care experience', 'CCRN certification', 'Hemodynamic monitoring'], salaryRange: [70000, 95000], matchingStrengths: [] },
          { id: 'nurs-cr-3', label: 'CRNA Doctoral Program', type: 'education', durationYears: 3, requirements: ['Advanced pharmacology', '2,000+ clinical hours', 'Doctoral project'], salaryRange: [0, 0], matchingStrengths: ['Nursing'] },
          { id: 'nurs-cr-4', label: 'Certified Nurse Anesthetist', type: 'senior', durationYears: 8, requirements: ['Independent anesthesia practice', 'Recertification every 4 years', 'Possible surgical center ownership'], salaryRange: [190000, 260000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'psychology',
    name: 'Psychology',
    description: 'Understand human behavior, cognition, and emotion through research and clinical practice.',
    icon: '🧠',
    category: 'social',
    paths: [
      {
        id: 'psych-clinical',
        name: 'Clinical Psychologist',
        peakSalary: 140000,
        milestones: [
          { id: 'psy-cl-1', label: "Bachelor's in Psychology", type: 'education', durationYears: 4, requirements: ['Abnormal Psychology', 'Research Methods', 'Statistics'], salaryRange: [0, 0], matchingStrengths: ['Psychology', 'Neuroscience'] },
          { id: 'psy-cl-2', label: 'PhD / PsyD in Clinical Psych', type: 'education', durationYears: 5, requirements: ['Dissertation research', 'Practicum hours (1,500+)', 'Clinical qualifying exams'], salaryRange: [25000, 35000], matchingStrengths: ['Psychology'] },
          { id: 'psy-cl-3', label: 'Postdoc / Licensure', type: 'training', durationYears: 2, requirements: ['Supervised clinical hours', 'EPPP exam', 'State licensure application'], salaryRange: [50000, 65000], matchingStrengths: [] },
          { id: 'psy-cl-4', label: 'Licensed Psychologist', type: 'senior', durationYears: 8, requirements: ['Private practice or hospital role', 'Specialty certification (e.g., neuropsych)', 'Continuing education'], salaryRange: [85000, 140000], matchingStrengths: [] },
        ],
      },
      {
        id: 'psych-io',
        name: 'Industrial-Organizational Psych',
        peakSalary: 180000,
        milestones: [
          { id: 'psy-io-1', label: "Bachelor's in Psychology", type: 'education', durationYears: 4, requirements: ['Organizational Behavior', 'Statistics', 'Social Psychology'], salaryRange: [0, 0], matchingStrengths: ['Psychology'] },
          { id: 'psy-io-2', label: "Master's in I/O Psychology", type: 'education', durationYears: 2, requirements: ['Psychometrics', 'Job analysis methods', 'Applied research project'], salaryRange: [0, 0], matchingStrengths: ['Psychology'] },
          { id: 'psy-io-3', label: 'HR Analyst / Consultant', type: 'early', durationYears: 3, requirements: ['Employee survey design', 'Selection system validation', 'Training program evaluation'], salaryRange: [70000, 95000], matchingStrengths: [] },
          { id: 'psy-io-4', label: 'Director of People Analytics', type: 'senior', durationYears: 5, requirements: ['Workforce strategy', 'Executive coaching', 'Organizational transformation'], salaryRange: [120000, 180000], matchingStrengths: [] },
        ],
      },
      {
        id: 'psych-ux',
        name: 'UX Researcher',
        peakSalary: 220000,
        milestones: [
          { id: 'psy-ux-1', label: "Bachelor's in Psychology / HCI", type: 'education', durationYears: 4, requirements: ['Cognitive Psychology', 'Research Design', 'HCI or UX electives'], salaryRange: [0, 0], matchingStrengths: ['Psychology', 'CS'] },
          { id: 'psy-ux-2', label: 'Junior UX Researcher', type: 'early', durationYears: 2, requirements: ['Usability testing', 'Survey design', 'Qualitative coding'], salaryRange: [70000, 95000], matchingStrengths: [] },
          { id: 'psy-ux-3', label: 'Senior UX Researcher', type: 'mid', durationYears: 3, requirements: ['Mixed-methods research', 'Strategic product insights', 'Stakeholder presentations'], salaryRange: [110000, 150000], matchingStrengths: [] },
          { id: 'psy-ux-4', label: 'Head of Research', type: 'senior', durationYears: 5, requirements: ['Research operations', 'Team leadership', 'Product strategy influence'], salaryRange: [150000, 220000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'economics',
    name: 'Economics',
    description: 'Analyze markets, policy, and human decision-making through data and theory.',
    icon: '📈',
    category: 'business',
    paths: [
      {
        id: 'econ-policy',
        name: 'Policy Economist',
        peakSalary: 200000,
        milestones: [
          { id: 'econ-p-1', label: "Bachelor's in Economics", type: 'education', durationYears: 4, requirements: ['Econometrics', 'Macro & Microeconomics', 'Calculus through Multivariable'], salaryRange: [0, 0], matchingStrengths: ['Economics', 'Public Policy', 'Political Science'] },
          { id: 'econ-p-2', label: "Master's / PhD in Economics", type: 'education', durationYears: 3, requirements: ['Applied econometrics research', 'Policy analysis thesis', 'Causal inference methods'], salaryRange: [30000, 40000], matchingStrengths: ['Economics'] },
          { id: 'econ-p-3', label: 'Research Economist', type: 'early', durationYears: 3, requirements: ['Federal Reserve, CBO, or think tank role', 'Policy brief writing', 'Congressional testimony prep'], salaryRange: [75000, 110000], matchingStrengths: [] },
          { id: 'econ-p-4', label: 'Senior Economist / Advisor', type: 'senior', durationYears: 6, requirements: ['Policy recommendations at national level', 'Published research', 'Media and stakeholder communication'], salaryRange: [120000, 200000], matchingStrengths: [] },
        ],
      },
      {
        id: 'econ-data',
        name: 'Data Scientist',
        peakSalary: 280000,
        milestones: [
          { id: 'econ-d-1', label: "Bachelor's in Econ / Stats", type: 'education', durationYears: 4, requirements: ['Econometrics', 'Probability & Statistics', 'Programming (R, Python)'], salaryRange: [0, 0], matchingStrengths: ['Economics', 'Math', 'CS'] },
          { id: 'econ-d-2', label: 'Junior Data Scientist', type: 'early', durationYears: 2, requirements: ['SQL & data pipelines', 'A/B testing frameworks', 'Statistical modeling'], salaryRange: [80000, 110000], matchingStrengths: [] },
          { id: 'econ-d-3', label: 'Senior Data Scientist', type: 'mid', durationYears: 3, requirements: ['Causal inference in industry', 'ML model deployment', 'Business problem framing'], salaryRange: [130000, 175000], matchingStrengths: [] },
          { id: 'econ-d-4', label: 'Head of Data Science', type: 'senior', durationYears: 5, requirements: ['Team and roadmap ownership', 'Executive decision support', 'Cross-org data strategy'], salaryRange: [180000, 280000], matchingStrengths: [] },
        ],
      },
      {
        id: 'econ-quant',
        name: 'Quantitative Analyst',
        peakSalary: 800000,
        milestones: [
          { id: 'econ-q-1', label: "Bachelor's in Econ / Math", type: 'education', durationYears: 4, requirements: ['Real Analysis', 'Stochastic Calculus', 'Financial Economics'], salaryRange: [0, 0], matchingStrengths: ['Economics', 'Math', 'Finance'] },
          { id: 'econ-q-2', label: "Master's in Financial Engineering", type: 'education', durationYears: 2, requirements: ['Derivatives pricing', 'Risk modeling', 'C++ or Python implementation'], salaryRange: [0, 0], matchingStrengths: ['Math', 'Finance'] },
          { id: 'econ-q-3', label: 'Quant Analyst', type: 'early', durationYears: 3, requirements: ['Alpha signal research', 'Backtesting infrastructure', 'Model validation'], salaryRange: [150000, 250000], matchingStrengths: [] },
          { id: 'econ-q-4', label: 'Senior Quant / Portfolio Manager', type: 'senior', durationYears: 5, requirements: ['Strategy P&L ownership', 'Risk management frameworks', 'Team leadership'], salaryRange: [300000, 800000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'polisci',
    name: 'Political Science',
    description: 'Study governance, law, and policy to shape public institutions and international affairs.',
    icon: '⚖️',
    category: 'social',
    paths: [
      {
        id: 'poli-law',
        name: 'Attorney',
        peakSalary: 500000,
        milestones: [
          { id: 'pol-l-1', label: "Bachelor's in Poli Sci / Pre-Law", type: 'education', durationYears: 4, requirements: ['Constitutional Law', 'Logic & Argumentation', 'Strong GPA & writing skills'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'Law', 'History'] },
          { id: 'pol-l-2', label: 'Law School (JD)', type: 'education', durationYears: 3, requirements: ['LSAT preparation', 'Law review or moot court', 'Summer associate positions'], salaryRange: [0, 0], matchingStrengths: ['Law'] },
          { id: 'pol-l-3', label: 'Associate Attorney', type: 'early', durationYears: 3, requirements: ['Bar exam passage', 'Brief and motion drafting', 'Client counseling'], salaryRange: [80000, 215000], matchingStrengths: [] },
          { id: 'pol-l-4', label: 'Partner / Senior Counsel', type: 'senior', durationYears: 7, requirements: ['Business development', 'Practice group leadership', 'Complex litigation or transactions'], salaryRange: [180000, 500000], matchingStrengths: [] },
        ],
      },
      {
        id: 'poli-govt',
        name: 'Government / Public Service',
        peakSalary: 160000,
        milestones: [
          { id: 'pol-g-1', label: "Bachelor's in Poli Sci", type: 'education', durationYears: 4, requirements: ['American Government', 'International Relations', 'Public Policy analysis'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'Public Policy', 'Government'] },
          { id: 'pol-g-2', label: 'Congressional Aide / Analyst', type: 'early', durationYears: 2, requirements: ['Legislative research', 'Constituent communication', 'Policy memo writing'], salaryRange: [40000, 60000], matchingStrengths: [] },
          { id: 'pol-g-3', label: 'MPP / MPA Program', type: 'education', durationYears: 2, requirements: ['Quantitative policy analysis', 'Public finance', 'Capstone project'], salaryRange: [0, 0], matchingStrengths: ['Public Policy'] },
          { id: 'pol-g-4', label: 'Senior Policy Advisor', type: 'senior', durationYears: 6, requirements: ['Agency or executive office role', 'Interagency coordination', 'Regulatory drafting'], salaryRange: [90000, 160000], matchingStrengths: [] },
        ],
      },
      {
        id: 'poli-intl',
        name: 'International Relations / Diplomacy',
        peakSalary: 190000,
        milestones: [
          { id: 'pol-i-1', label: "Bachelor's in Poli Sci / IR", type: 'education', durationYears: 4, requirements: ['International Relations theory', 'Foreign language proficiency', 'Study abroad recommended'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'International Studies'] },
          { id: 'pol-i-2', label: "Master's in International Affairs", type: 'education', durationYears: 2, requirements: ['Regional specialization', 'Security or development focus', 'Internship with NGO or embassy'], salaryRange: [0, 0], matchingStrengths: ['International Studies'] },
          { id: 'pol-i-3', label: 'Foreign Service Officer / NGO', type: 'early', durationYears: 3, requirements: ['FSOT exam (for State Dept)', 'Cross-cultural negotiation', 'Field deployments'], salaryRange: [60000, 95000], matchingStrengths: [] },
          { id: 'pol-i-4', label: 'Senior Diplomat / Director', type: 'senior', durationYears: 8, requirements: ['Embassy leadership', 'Treaty negotiation', 'Strategic policy influence'], salaryRange: [120000, 190000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'communications',
    name: 'Communications',
    description: 'Master storytelling, media, and persuasion to connect brands with audiences.',
    icon: '📡',
    category: 'creative',
    paths: [
      {
        id: 'comm-marketing',
        name: 'Marketing / Brand Strategy',
        peakSalary: 280000,
        milestones: [
          { id: 'com-m-1', label: "Bachelor's in Comms / Marketing", type: 'education', durationYears: 4, requirements: ['Marketing Principles', 'Consumer Behavior', 'Digital Media'], salaryRange: [0, 0], matchingStrengths: ['Journalism', 'Business'] },
          { id: 'com-m-2', label: 'Marketing Coordinator', type: 'early', durationYears: 2, requirements: ['Campaign execution', 'Social media management', 'Analytics tools (GA, HubSpot)'], salaryRange: [45000, 60000], matchingStrengths: [] },
          { id: 'com-m-3', label: 'Marketing Manager', type: 'mid', durationYears: 3, requirements: ['Budget ownership', 'Brand positioning', 'Agency management'], salaryRange: [70000, 100000], matchingStrengths: [] },
          { id: 'com-m-4', label: 'VP of Marketing / CMO', type: 'senior', durationYears: 6, requirements: ['Go-to-market strategy', 'Revenue attribution', 'Executive leadership'], salaryRange: [150000, 280000], matchingStrengths: [] },
        ],
      },
      {
        id: 'comm-pr',
        name: 'Public Relations',
        peakSalary: 200000,
        milestones: [
          { id: 'com-pr-1', label: "Bachelor's in Comms / PR", type: 'education', durationYears: 4, requirements: ['Media Writing', 'Crisis Communication', 'Public Speaking'], salaryRange: [0, 0], matchingStrengths: ['Journalism'] },
          { id: 'com-pr-2', label: 'PR Associate', type: 'early', durationYears: 2, requirements: ['Press release writing', 'Media list building', 'Event coordination'], salaryRange: [42000, 55000], matchingStrengths: [] },
          { id: 'com-pr-3', label: 'PR Manager', type: 'mid', durationYears: 3, requirements: ['Media relations strategy', 'Crisis management plans', 'Executive media training'], salaryRange: [65000, 95000], matchingStrengths: [] },
          { id: 'com-pr-4', label: 'VP of Communications', type: 'senior', durationYears: 5, requirements: ['Corporate reputation strategy', 'C-suite advising', 'ESG and stakeholder comms'], salaryRange: [120000, 200000], matchingStrengths: [] },
        ],
      },
      {
        id: 'comm-media',
        name: 'Media Producer / Content',
        peakSalary: 200000,
        milestones: [
          { id: 'com-md-1', label: "Bachelor's in Comms / Film", type: 'education', durationYears: 4, requirements: ['Video Production', 'Storytelling & Narrative', 'Audio editing'], salaryRange: [0, 0], matchingStrengths: ['Journalism', 'Film'] },
          { id: 'com-md-2', label: 'Production Assistant / Editor', type: 'early', durationYears: 2, requirements: ['Adobe Premiere / Final Cut', 'Podcast or video portfolio', 'Social platform trends'], salaryRange: [38000, 55000], matchingStrengths: [] },
          { id: 'com-md-3', label: 'Senior Producer', type: 'mid', durationYears: 3, requirements: ['Series development', 'Audience analytics', 'Budget and timeline management'], salaryRange: [70000, 110000], matchingStrengths: [] },
          { id: 'com-md-4', label: 'Executive Producer / Head of Content', type: 'senior', durationYears: 5, requirements: ['Content strategy', 'Distribution partnerships', 'Team and vendor management'], salaryRange: [120000, 200000], matchingStrengths: [] },
        ],
      },
    ],
  },
  {
    id: 'art-design',
    name: 'Art & Design',
    description: 'Create visual experiences — from digital interfaces to architecture to brand identities.',
    icon: '🎨',
    category: 'creative',
    paths: [
      {
        id: 'art-ux',
        name: 'UX / UI Designer',
        peakSalary: 230000,
        milestones: [
          { id: 'art-ux-1', label: "Bachelor's in Design / HCI", type: 'education', durationYears: 4, requirements: ['Visual Design fundamentals', 'Interaction Design', 'User Research methods'], salaryRange: [0, 0], matchingStrengths: ['Art', 'Design', 'Architecture'] },
          { id: 'art-ux-2', label: 'Junior UX Designer', type: 'early', durationYears: 2, requirements: ['Figma / Sketch proficiency', 'Portfolio of 3-5 case studies', 'Wireframing & prototyping'], salaryRange: [65000, 85000], matchingStrengths: [] },
          { id: 'art-ux-3', label: 'Senior UX Designer', type: 'mid', durationYears: 3, requirements: ['Design system creation', 'Cross-platform design', 'Usability testing leadership'], salaryRange: [100000, 145000], matchingStrengths: [] },
          { id: 'art-ux-4', label: 'Design Director', type: 'senior', durationYears: 5, requirements: ['Design org leadership', 'Product strategy partnership', 'Brand design language'], salaryRange: [150000, 230000], matchingStrengths: [] },
        ],
      },
      {
        id: 'art-graphic',
        name: 'Graphic Designer / Brand',
        peakSalary: 200000,
        milestones: [
          { id: 'art-g-1', label: "Bachelor's in Graphic Design", type: 'education', durationYears: 4, requirements: ['Typography', 'Color Theory', 'Print & Digital layout'], salaryRange: [0, 0], matchingStrengths: ['Art', 'Design'] },
          { id: 'art-g-2', label: 'Junior Designer', type: 'early', durationYears: 2, requirements: ['Adobe Creative Suite', 'Brand identity projects', 'Client presentations'], salaryRange: [42000, 58000], matchingStrengths: [] },
          { id: 'art-g-3', label: 'Senior Designer / Art Director', type: 'mid', durationYears: 4, requirements: ['Campaign creative direction', 'Team mentorship', 'Multi-channel brand systems'], salaryRange: [70000, 110000], matchingStrengths: [] },
          { id: 'art-g-4', label: 'Creative Director', type: 'senior', durationYears: 5, requirements: ['Agency or in-house creative vision', 'Award-winning portfolio', 'P&L for creative department'], salaryRange: [120000, 200000], matchingStrengths: [] },
        ],
      },
      {
        id: 'art-arch',
        name: 'Architect',
        peakSalary: 250000,
        milestones: [
          { id: 'art-ar-1', label: "Bachelor's in Architecture (5yr)", type: 'education', durationYears: 5, requirements: ['Design Studio sequence', 'Structures & Materials', 'Architectural History'], salaryRange: [0, 0], matchingStrengths: ['Architecture', 'Design', 'Art'] },
          { id: 'art-ar-2', label: 'Architectural Intern (AXP)', type: 'training', durationYears: 3, requirements: ['3,740 AXP hours', 'Revit / AutoCAD proficiency', 'Construction documentation'], salaryRange: [50000, 65000], matchingStrengths: [] },
          { id: 'art-ar-3', label: 'Licensed Architect (ARE)', type: 'mid', durationYears: 4, requirements: ['Pass all 6 ARE divisions', 'Project management', 'Code compliance expertise'], salaryRange: [75000, 110000], matchingStrengths: [] },
          { id: 'art-ar-4', label: 'Principal / Partner', type: 'senior', durationYears: 6, requirements: ['Firm leadership', 'Competition-winning designs', 'Business development'], salaryRange: [120000, 250000], matchingStrengths: [] },
        ],
      },
    ],
  },

  /* ──────────── FINANCE ──────────── */
  {
    id: 'finance',
    name: 'Finance',
    description: 'High-stakes capital markets, deals, and money management — where quantitative rigor meets big compensation.',
    icon: '💰',
    category: 'business',
    paths: [
      {
        id: 'fin-ib',
        name: 'Investment Banking',
        peakSalary: 600000,
        milestones: [
          { id: 'fin-ib-1', label: "Bachelor's in Finance / Econ", type: 'education', durationYears: 4, requirements: ['Financial modeling & valuation', 'Accounting & corporate finance', 'Target-school recruiting & networking'], salaryRange: [0, 0], matchingStrengths: ['Finance', 'Business', 'Economics'] },
          { id: 'fin-ib-2', label: 'IB Analyst', type: 'early', durationYears: 2, requirements: ['DCF / LBO / comps modeling', 'Pitch books & due diligence', '80-100 hour weeks'], salaryRange: [110000, 175000], matchingStrengths: [] },
          { id: 'fin-ib-3', label: 'Associate', type: 'mid', durationYears: 3, requirements: ['Manage analyst teams', 'Direct client interaction', 'Deal execution'], salaryRange: [200000, 350000], matchingStrengths: [] },
          { id: 'fin-ib-4', label: 'VP → Managing Director', type: 'senior', durationYears: 6, requirements: ['Originate & close deals', 'Own client relationships', 'Revenue generation'], salaryRange: [400000, 1000000], matchingStrengths: [] },
        ],
      },
      {
        id: 'fin-pe',
        name: 'Private Equity',
        peakSalary: 1000000,
        milestones: [
          { id: 'fin-pe-1', label: "Bachelor's + IB foundation", type: 'education', durationYears: 4, requirements: ['Finance / Econ degree', 'LBO modeling mastery', 'Recruit into banking first'], salaryRange: [0, 0], matchingStrengths: ['Finance', 'Business', 'Economics'] },
          { id: 'fin-pe-2', label: 'PE Associate', type: 'early', durationYears: 3, requirements: ['Deal sourcing & diligence', 'Leveraged buyout models', 'Portfolio company monitoring'], salaryRange: [150000, 300000], matchingStrengths: [] },
          { id: 'fin-pe-3', label: 'Vice President / Principal', type: 'mid', durationYears: 4, requirements: ['Lead deal teams', 'Portfolio value creation', 'Investor relations'], salaryRange: [350000, 600000], matchingStrengths: [] },
          { id: 'fin-pe-4', label: 'Partner', type: 'senior', durationYears: 6, requirements: ['Raise & deploy funds', 'Board seats', 'Carried interest / strategy'], salaryRange: [700000, 3000000], matchingStrengths: [] },
        ],
      },
      {
        id: 'fin-wealth',
        name: 'Wealth Management',
        peakSalary: 400000,
        milestones: [
          { id: 'fin-wealth-1', label: "Bachelor's in Finance / Business", type: 'education', durationYears: 4, requirements: ['Investments & personal finance', 'Series 7 & 66 prep', 'Relationship-building skills'], salaryRange: [0, 0], matchingStrengths: ['Finance', 'Business', 'Communications'] },
          { id: 'fin-wealth-2', label: 'Associate Advisor', type: 'early', durationYears: 3, requirements: ['Pass Series 7 & 66', 'Financial planning software', 'Begin building a client book'], salaryRange: [60000, 100000], matchingStrengths: [] },
          { id: 'fin-wealth-3', label: 'Financial Advisor (CFP)', type: 'mid', durationYears: 4, requirements: ['Earn CFP certification', '$50M+ assets under management', 'Estate & tax planning'], salaryRange: [100000, 200000], matchingStrengths: [] },
          { id: 'fin-wealth-4', label: 'Senior Advisor / Partner', type: 'senior', durationYears: 5, requirements: ['$200M+ AUM', 'High-net-worth clients', 'Team leadership'], salaryRange: [200000, 600000], matchingStrengths: [] },
        ],
      },
    ],
  },

  /* ──────────── MANAGEMENT & OPERATIONS ──────────── */
  {
    id: 'management',
    name: 'Management & Operations',
    description: 'The people who ship products, run programs, and drive revenue — connecting teams, customers, and strategy.',
    icon: '📈',
    category: 'business',
    paths: [
      {
        id: 'mgmt-product',
        name: 'Product Manager',
        peakSalary: 350000,
        milestones: [
          { id: 'mgmt-product-1', label: "Bachelor's (Business / Tech)", type: 'education', durationYears: 4, requirements: ['Business or technical fundamentals', 'Product / APM internships', 'User research & analytics'], salaryRange: [0, 0], matchingStrengths: ['Business', 'CS', 'Communications'] },
          { id: 'mgmt-product-2', label: 'Associate PM', type: 'early', durationYears: 2, requirements: ['APM program or rotation', 'Roadmapping & prioritization', 'A/B testing & metrics'], salaryRange: [90000, 130000], matchingStrengths: [] },
          { id: 'mgmt-product-3', label: 'Product Manager', type: 'mid', durationYears: 3, requirements: ['Own a product area', 'Stakeholder alignment', 'Data-driven decisions'], salaryRange: [130000, 190000], matchingStrengths: [] },
          { id: 'mgmt-product-4', label: 'Director / VP of Product', type: 'senior', durationYears: 5, requirements: ['Product vision & strategy', 'P&L ownership', 'Lead PM teams'], salaryRange: [200000, 350000], matchingStrengths: [] },
        ],
      },
      {
        id: 'mgmt-program',
        name: 'Program Manager',
        peakSalary: 280000,
        milestones: [
          { id: 'mgmt-program-1', label: "Bachelor's (Business / Eng)", type: 'education', durationYears: 4, requirements: ['Business or engineering degree', 'Project coordination experience', 'Agile / Scrum fundamentals'], salaryRange: [0, 0], matchingStrengths: ['Business', 'Communications', 'Engineering'] },
          { id: 'mgmt-program-2', label: 'Program Coordinator / Jr PM', type: 'early', durationYears: 2, requirements: ['Manage timelines & dependencies', 'Stakeholder communication', 'PMP or CSM certification'], salaryRange: [70000, 100000], matchingStrengths: [] },
          { id: 'mgmt-program-3', label: 'Technical Program Manager', type: 'mid', durationYears: 3, requirements: ['Drive cross-team delivery', 'Risk & dependency management', 'Own complex launches'], salaryRange: [120000, 180000], matchingStrengths: [] },
          { id: 'mgmt-program-4', label: 'Sr TPM / Director of Programs', type: 'senior', durationYears: 5, requirements: ['Org-wide programs', 'Executive reporting', 'Process design'], salaryRange: [180000, 280000], matchingStrengths: [] },
        ],
      },
      {
        id: 'mgmt-sales',
        name: 'Sales / Account Executive',
        peakSalary: 400000,
        milestones: [
          { id: 'mgmt-sales-1', label: "Bachelor's (any) + comms skills", type: 'education', durationYears: 4, requirements: ['Any major', 'Sales / business-development internships', 'CRM & communication skills'], salaryRange: [0, 0], matchingStrengths: ['Business', 'Communications'] },
          { id: 'mgmt-sales-2', label: 'Sales Development Rep (SDR)', type: 'early', durationYears: 2, requirements: ['Prospecting & cold outreach', 'Hit pipeline quotas', 'Master the product'], salaryRange: [50000, 90000], matchingStrengths: [] },
          { id: 'mgmt-sales-3', label: 'Account Executive', type: 'mid', durationYears: 3, requirements: ['Close deals & manage the cycle', 'Consistent quota attainment', 'Negotiation'], salaryRange: [100000, 200000], matchingStrengths: [] },
          { id: 'mgmt-sales-4', label: 'Enterprise AE / Sales Director', type: 'senior', durationYears: 5, requirements: ['Large enterprise accounts', 'Lead a sales team', 'Strategic account growth'], salaryRange: [200000, 500000], matchingStrengths: [] },
        ],
      },
    ],
  },

  /* ──────────── AVIATION ──────────── */
  {
    id: 'aviation',
    name: 'Aviation',
    description: 'A cockpit career path from first flight lesson to the left seat of an airliner — highly regulated, seniority-driven, and in demand.',
    icon: '✈️',
    category: 'aviation',
    paths: [
      {
        id: 'avi-airline',
        name: 'Airline Pilot',
        peakSalary: 400000,
        milestones: [
          { id: 'avi-airline-1', label: "Bachelor's + Flight School", type: 'education', durationYears: 4, requirements: ["Bachelor's degree (preferred by majors)", 'Private Pilot & Instrument ratings', 'Commercial Pilot License'], salaryRange: [0, 0], matchingStrengths: ['Aviation'] },
          { id: 'avi-airline-2', label: 'Flight Instructor / Hour Building', type: 'training', durationYears: 2, requirements: ['Certified Flight Instructor (CFI)', 'Build ~1,500 hours for the ATP', 'Multi-engine time'], salaryRange: [40000, 70000], matchingStrengths: [] },
          { id: 'avi-airline-3', label: 'Regional Airline First Officer', type: 'early', durationYears: 3, requirements: ['ATP certificate', 'Aircraft type rating', 'Regional carrier experience'], salaryRange: [80000, 150000], matchingStrengths: [] },
          { id: 'avi-airline-4', label: 'Major Airline Captain', type: 'senior', durationYears: 6, requirements: ['Upgrade to Captain', 'Wide-body / international routes', 'Build seniority'], salaryRange: [200000, 400000], matchingStrengths: [] },
        ],
      },
      {
        id: 'avi-corporate',
        name: 'Corporate / Charter Pilot',
        peakSalary: 250000,
        milestones: [
          { id: 'avi-corporate-1', label: 'Flight Training & Licenses', type: 'education', durationYears: 4, requirements: ['Commercial Pilot License', 'Instrument & Multi-engine ratings', "Bachelor's helpful"], salaryRange: [0, 0], matchingStrengths: ['Aviation'] },
          { id: 'avi-corporate-2', label: 'Charter (Part 135) Pilot', type: 'early', durationYears: 3, requirements: ['Build turbine time', 'Aircraft type ratings', 'Part 135 operations'], salaryRange: [60000, 110000], matchingStrengths: [] },
          { id: 'avi-corporate-3', label: 'Corporate Jet First Officer', type: 'mid', durationYears: 3, requirements: ['Business-jet type rating', 'International operations', 'Client service'], salaryRange: [100000, 160000], matchingStrengths: [] },
          { id: 'avi-corporate-4', label: 'Captain / Chief Pilot', type: 'senior', durationYears: 5, requirements: ['Flight department leadership', 'Scheduling & safety oversight', 'Owner / executive relations'], salaryRange: [150000, 250000], matchingStrengths: [] },
        ],
      },
    ],
  },

  /* ──────────── LAW & LEGAL STUDIES ──────────── */
  {
    id: 'law',
    name: 'Law & Legal Studies',
    description: 'From LSAT to law school to the bar — the paths into corporate practice, the courtroom, and public-interest advocacy.',
    icon: '⚖️',
    category: 'social',
    paths: [
      {
        id: 'law-corporate',
        name: 'Corporate Lawyer',
        peakSalary: 700000,
        milestones: [
          { id: 'law-corporate-1', label: "Bachelor's (any) + LSAT", type: 'education', durationYears: 4, requirements: ['Strong GPA in any major', 'LSAT preparation', 'Pre-law internships'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'Business', 'Economics'] },
          { id: 'law-corporate-2', label: 'Juris Doctor (JD)', type: 'education', durationYears: 3, requirements: ['Top law school for BigLaw', 'Law review / journal', 'Summer associate position'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'Business'] },
          { id: 'law-corporate-3', label: 'BigLaw Associate', type: 'early', durationYears: 4, requirements: ['Pass the Bar exam', 'M&A / securities work', '2,000+ billable hours'], salaryRange: [200000, 315000], matchingStrengths: [] },
          { id: 'law-corporate-4', label: 'Partner / General Counsel', type: 'senior', durationYears: 6, requirements: ['Book of business / origination', 'Firm equity or in-house GC role', 'Client leadership'], salaryRange: [400000, 1000000], matchingStrengths: [] },
        ],
      },
      {
        id: 'law-litigator',
        name: 'Litigator / Trial Attorney',
        peakSalary: 450000,
        milestones: [
          { id: 'law-litigator-1', label: "Bachelor's (any) + LSAT", type: 'education', durationYears: 4, requirements: ['Any major', 'LSAT preparation', 'Mock trial / debate'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'Communications'] },
          { id: 'law-litigator-2', label: 'JD + Trial Advocacy', type: 'education', durationYears: 3, requirements: ['Trial advocacy coursework', 'Clerkship or DA internship', 'Moot court'], salaryRange: [0, 0], matchingStrengths: ['Political Science', 'Communications'] },
          { id: 'law-litigator-3', label: 'Litigation Associate', type: 'early', durationYears: 4, requirements: ['Pass the Bar exam', 'Depositions & motions', 'Build courtroom experience'], salaryRange: [90000, 200000], matchingStrengths: [] },
          { id: 'law-litigator-4', label: 'Trial Partner / Senior Litigator', type: 'senior', durationYears: 6, requirements: ['First-chair trials', 'Case strategy', 'Client origination'], salaryRange: [250000, 600000], matchingStrengths: [] },
        ],
      },
      {
        id: 'law-public',
        name: 'Public Interest Lawyer',
        peakSalary: 180000,
        milestones: [
          { id: 'law-public-1', label: "Bachelor's (any) + LSAT", type: 'education', durationYears: 4, requirements: ['Any major', 'LSAT preparation', 'Advocacy / volunteer work'], salaryRange: [0, 0], matchingStrengths: ['Political Science'] },
          { id: 'law-public-2', label: 'JD (Public Interest focus)', type: 'education', durationYears: 3, requirements: ['Legal clinics & externships', 'Public-interest fellowship', 'Loan repayment (LRAP) planning'], salaryRange: [0, 0], matchingStrengths: ['Political Science'] },
          { id: 'law-public-3', label: 'Public Defender / Agency Attorney', type: 'early', durationYears: 4, requirements: ['Pass the Bar exam', 'High caseload management', 'Courtroom / agency work'], salaryRange: [60000, 90000], matchingStrengths: [] },
          { id: 'law-public-4', label: 'Senior Attorney / Nonprofit Director', type: 'senior', durationYears: 6, requirements: ['Impact litigation', 'Policy advocacy', 'Organizational leadership'], salaryRange: [100000, 180000], matchingStrengths: [] },
        ],
      },
    ],
  },
];

/* ──────────────────────── CAREER PATH OVERVIEWS ────────────────────────
   Rich, in-depth context per path (keyed by path id). Rendered by the
   roadmap view above the timeline so each career is a real deep-dive, not a
   dead-end. Existing-major overviews are appended below the new ones. */

export const PATH_OVERVIEWS: Record<string, CareerOverview> = {
  ...BASE_OVERVIEWS,
  'fin-ib': {
    summary: 'Advise companies on raising capital and executing mergers and acquisitions — building financial models and valuations, then running deals from pitch to close.',
    keySkills: ['Financial modeling (DCF, LBO, comps)', 'Valuation', 'Accounting fluency', 'Precision under deadline', 'Client communication'],
    outlook: 'Highly competitive entry; steady demand at bulge-bracket and boutique banks, with strong exits into PE, hedge funds, and corporate roles.',
    entryTips: ['Recruit early — sophomore-year internships matter', 'Target a core/semi-target school or network relentlessly', 'Master modeling (WSP/BIWS or equivalent)', 'Keep a high GPA and a clean, quantitative resume'],
    licenses: ['SIE', 'Series 79', 'Series 63'],
    topEmployers: ['Goldman Sachs', 'Morgan Stanley', 'J.P. Morgan', 'Evercore', 'Centerview', 'Lazard'],
    workStyle: 'Prestigious and lucrative but brutal hours (80-100/week as an analyst), especially in the first two years.',
    alsoConsider: ['Private Equity', 'Management Consulting', 'Corporate Development'],
  },
  'fin-pe': {
    summary: 'Buy, improve, and sell companies using investor capital and debt — sourcing deals, building leveraged-buyout models, and driving value in portfolio companies.',
    keySkills: ['LBO modeling', 'Deal diligence', 'Operational analysis', 'Negotiation', 'Investor relations'],
    outlook: 'Small, elite field that almost always requires 2+ years of banking or consulting first. Exceptional pay, very hard to break into.',
    entryTips: ['Land investment banking (or top consulting) out of undergrad', 'Recruit during the on-cycle PE process', 'Develop a sharp LBO-modeling skill set', 'Form a point of view on industries and value creation'],
    licenses: [],
    topEmployers: ['Blackstone', 'KKR', 'Apollo', 'Carlyle', 'TPG', 'Bain Capital'],
    workStyle: 'Long hours but more analytical and less production-line than banking; intense during live deals.',
    alsoConsider: ['Investment Banking', 'Venture Capital', 'Hedge Funds'],
  },
  'fin-wealth': {
    summary: 'Help individuals and families grow and protect their money — building financial plans, managing portfolios, and advising on retirement, taxes, and estates.',
    keySkills: ['Financial planning', 'Investment knowledge', 'Relationship-building', 'Communication', 'Business development'],
    outlook: 'Growing steadily as wealth transfers between generations; success hinges on building a client book, which takes years.',
    entryTips: ['Pass the Series 7 and 66 early', 'Pursue the CFP certification', 'Join an established advisor or firm to learn', 'Develop a niche (physicians, tech, business owners)'],
    licenses: ['Series 7', 'Series 66', 'CFP'],
    topEmployers: ['Morgan Stanley', 'Merrill Lynch', 'Fidelity', 'Charles Schwab', 'Edward Jones', 'Independent RIAs'],
    workStyle: 'Relationship-driven with more schedule control as your client base matures; the early years are sales-heavy.',
    alsoConsider: ['Financial Planning', 'Corporate Finance', 'Insurance & Estate Planning'],
  },
  'mgmt-product': {
    summary: "Own the 'why' and 'what' of a product — talking to users, defining the roadmap, prioritizing features, and steering engineering, design, and business toward launch.",
    keySkills: ['User empathy & research', 'Prioritization', 'Data analysis', 'Cross-functional communication', 'Strategic thinking'],
    outlook: 'Strong demand across tech and non-tech companies; APM roles are competitive but a reliable on-ramp.',
    entryTips: ['Do an APM or product internship', 'Ship a side project or lead a product initiative', 'Learn analytics (SQL, A/B testing) and basic UX', 'Practice product-sense and case interviews'],
    licenses: [],
    topEmployers: ['Google', 'Microsoft', 'Amazon', 'Atlassian', 'Fintech & SaaS companies', 'Startups'],
    workStyle: 'Collaborative and fast-paced; you have wide influence but rarely direct authority, so persuasion is everything.',
    alsoConsider: ['Program Manager', 'UX Research', 'Management Consulting'],
  },
  'mgmt-program': {
    summary: 'Keep complex, multi-team initiatives on track — mapping dependencies, managing risk and timelines, and driving cross-functional launches to completion.',
    keySkills: ['Organization & planning', 'Risk management', 'Stakeholder communication', 'Agile / Scrum', 'Cross-team coordination'],
    outlook: 'Steady demand, especially for technical program managers (TPMs) in tech; a strong path for organized, people-savvy generalists.',
    entryTips: ['Earn a PMP or CSM certification', 'Own a real project end-to-end', 'Build fluency in Agile tools (Jira, etc.)', 'Develop technical literacy for TPM roles'],
    licenses: ['PMP', 'CSM'],
    topEmployers: ['Amazon', 'Microsoft', 'Google', 'Meta', 'Consulting firms', 'Large enterprises'],
    workStyle: 'Structured and coordination-heavy; you are the glue across teams and the person accountable for delivery.',
    alsoConsider: ['Product Manager', 'Management Consulting', 'Operations Manager'],
  },
  'mgmt-sales': {
    summary: 'Drive revenue by finding prospects, understanding their needs, and closing deals — from first cold outreach to a signed contract and renewal.',
    keySkills: ['Communication & persuasion', 'Relationship-building', 'Negotiation', 'Resilience', 'CRM & pipeline management'],
    outlook: 'Abundant openings and fast advancement; top performers in tech/SaaS sales can out-earn many prestige careers.',
    entryTips: ['Start as an SDR/BDR to learn the craft', 'Target high-growth SaaS or tech companies', 'Develop deep product and industry expertise', 'Track and optimize your own metrics obsessively'],
    licenses: [],
    topEmployers: ['Salesforce', 'Oracle', 'SAP', 'HubSpot', 'High-growth SaaS startups', 'Medical-device firms'],
    workStyle: 'Quota-driven and high-pressure but high-upside; income scales directly with performance through commission.',
    alsoConsider: ['Marketing', 'Customer Success', 'Business Development'],
  },
  'avi-airline': {
    summary: 'Fly passengers or cargo for a commercial airline — operating advanced aircraft safely under FAA rules and advancing by seniority from first officer to captain.',
    keySkills: ['Airmanship & judgment', 'Situational awareness', 'ATC / crew communication', 'Stress management', 'Systems knowledge'],
    outlook: 'Strong hiring from retirements and travel demand, though cyclical; a well-defined seniority ladder rewards longevity.',
    entryTips: ['Earn PPL, Instrument, and Commercial licenses', 'Instruct (CFI) to build the ~1,500 hours for an ATP', 'Start at a regional airline, then move to a major', 'Consider a university aviation program or the military route'],
    licenses: ['FAA ATP', 'Class 1 Medical', 'Aircraft Type Ratings'],
    topEmployers: ['Delta', 'United', 'American', 'Southwest', 'FedEx', 'UPS'],
    workStyle: 'Structured but variable schedule with overnights away from home; seniority dictates routes, pay, and quality of life.',
    alsoConsider: ['Corporate / Charter Pilot', 'Aerospace Engineer', 'Air Traffic Control'],
  },
  'avi-corporate': {
    summary: 'Fly business jets for companies, charter operators, or private owners — high-touch, flexible service on tailored routes rather than fixed airline schedules.',
    keySkills: ['Airmanship', 'Customer service', 'Flexibility', 'International operations', 'Attention to detail'],
    outlook: 'Steady demand from business aviation; often a faster route to a captain seat than the airlines, but with less standardized pay.',
    entryTips: ['Earn Commercial, Instrument, and Multi-engine ratings', 'Build turbine time via Part 135 charter', 'Add business-jet type ratings', 'Network within flight departments and FBOs'],
    licenses: ['FAA Commercial / ATP', 'Aircraft Type Ratings', 'Class 1 Medical'],
    topEmployers: ['NetJets', 'Flexjet', 'Corporate flight departments', 'Charter operators', 'Fractional-ownership fleets'],
    workStyle: 'More schedule variety and client contact than the airlines; on-call demands but often home more often.',
    alsoConsider: ['Airline Pilot', 'Aerospace Engineer', 'Flight Instructor'],
  },
  'law-corporate': {
    summary: 'Advise businesses on transactions and compliance — drafting and negotiating contracts, structuring mergers and financings, and managing legal risk.',
    keySkills: ['Legal analysis & writing', 'Attention to detail', 'Negotiation', 'Business acumen', 'Stamina'],
    outlook: 'BigLaw pays extremely well but is pyramid-shaped and demanding; in-house counsel roles offer strong pay with better balance.',
    entryTips: ['Maximize GPA and LSAT for a top law school', 'Aim for law review and a summer-associate offer', 'Take corporate, tax, and securities coursework', 'Network for the 2L summer that converts to full-time'],
    licenses: ['Juris Doctor (JD)', 'State Bar admission'],
    topEmployers: ['Kirkland & Ellis', 'Latham & Watkins', 'Skadden', 'Cravath', 'Wachtell', 'In-house legal departments'],
    workStyle: 'Prestigious and lucrative with long, deadline-driven hours; billable-hour targets define the first several years.',
    alsoConsider: ['Investment Banking', 'Litigator', 'Compliance / Regulatory'],
  },
  'law-litigator': {
    summary: 'Represent clients in disputes — investigating cases, taking depositions, filing motions, and arguing before judges and juries to resolve or win at trial.',
    keySkills: ['Persuasive writing & speaking', 'Legal research', 'Case strategy', 'Cross-examination', 'Composure under pressure'],
    outlook: 'Consistent demand across firms, government, and public interest; genuine trial experience is increasingly rare and valued.',
    entryTips: ['Do mock trial or moot court', 'Seek a judicial clerkship or DA/PD internship', 'Take trial advocacy and evidence courses', 'Build clear, persuasive writing and speaking'],
    licenses: ['Juris Doctor (JD)', 'State Bar admission'],
    topEmployers: ['Litigation boutiques', 'US Attorney / DA offices', 'Public Defender offices', 'Full-service law firms', 'Government agencies'],
    workStyle: 'Adversarial and deadline-intensive with courtroom highs; heavy preparation between the dramatic moments.',
    alsoConsider: ['Corporate Lawyer', 'Public Interest Lawyer', 'Government / Public Service'],
  },
  'law-public': {
    summary: 'Use the law to serve people and causes — defending clients who cannot afford counsel, litigating for civil rights, or advocating policy at nonprofits and agencies.',
    keySkills: ['Advocacy', 'Legal research & writing', 'Empathy', 'Caseload management', 'Resilience'],
    outlook: 'Deeply mission-driven with modest pay; loan-repayment (LRAP) and forgiveness (PSLF) programs help offset law-school debt.',
    entryTips: ['Pursue legal clinics and public-interest externships', 'Apply for fellowships (Skadden, Equal Justice Works)', 'Leverage LRAP/PSLF for loan relief', 'Build a real track record of advocacy'],
    licenses: ['Juris Doctor (JD)', 'State Bar admission'],
    topEmployers: ['Public Defender offices', 'ACLU', 'Legal Aid societies', 'Government agencies', 'Advocacy nonprofits'],
    workStyle: 'High caseloads and lower pay, but meaningful, people-centered work with real community impact.',
    alsoConsider: ['Litigator', 'Government / Public Service', 'International Relations / Diplomacy'],
  },
};

/* ──────────────────────── EXPLORATION QUIZ ──────────────────────── */

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'When you encounter a problem you\'ve never seen before, what\'s your first instinct?',
    options: [
      { label: 'Break it into pieces and test each part systematically', weights: { cs: 3, engineering: 3, economics: 2, biology: 1 } },
      { label: 'Talk to people who\'ve faced something similar', weights: { communications: 3, psychology: 2, polisci: 2, business: 1 } },
      { label: 'Sketch, diagram, or visualize different angles', weights: { 'art-design': 3, engineering: 2, communications: 1, business: 1 } },
      { label: 'Research the history and context behind it first', weights: { polisci: 3, economics: 2, psychology: 2, biology: 1 } },
    ],
  },
  {
    id: 'q2',
    text: 'You have a free Saturday with no obligations. What sounds most fulfilling?',
    options: [
      { label: 'Building or tinkering with something — code, circuits, a shelf', weights: { cs: 3, engineering: 3, 'art-design': 1 } },
      { label: 'Volunteering or spending time helping people one-on-one', weights: { nursing: 3, psychology: 2, biology: 1, polisci: 1 } },
      { label: 'Reading long-form journalism or debating ideas with friends', weights: { polisci: 3, economics: 2, communications: 2 } },
      { label: 'Working on a creative project — writing, drawing, filming', weights: { 'art-design': 3, communications: 3, psychology: 1 } },
    ],
  },
  {
    id: 'q3',
    text: 'Which type of frustration would bother you the LEAST?',
    options: [
      { label: 'Spending weeks debugging something with no guarantee it works', weights: { cs: 3, engineering: 2, economics: 1 } },
      { label: 'Navigating bureaucracy and politics to get approval for a project', weights: { polisci: 3, law: 2, business: 2, management: 1, communications: 1, nursing: 1 } },
      { label: 'Memorizing large amounts of detailed, technical material', weights: { biology: 3, nursing: 2, economics: 1, polisci: 1 } },
      { label: 'Having your work critiqued subjectively with no clear "right answer"', weights: { 'art-design': 3, communications: 2, psychology: 2 } },
    ],
  },
  {
    id: 'q4',
    text: 'When choosing between two options, which factor carries more weight for you?',
    options: [
      { label: 'Financial stability and clear advancement milestones', weights: { business: 3, economics: 3, finance: 3, engineering: 2, aviation: 1, cs: 1 } },
      { label: 'Daily sense of meaning and direct positive impact', weights: { nursing: 3, biology: 2, psychology: 2, polisci: 1 } },
      { label: 'Autonomy and creative freedom in how I spend my time', weights: { 'art-design': 3, communications: 2, cs: 1, business: 1 } },
      { label: 'Intellectual challenge and continuous learning', weights: { cs: 2, economics: 2, biology: 2, engineering: 2, psychology: 1 } },
    ],
  },
  {
    id: 'q5',
    text: 'In group projects, which role do you naturally gravitate toward?',
    options: [
      { label: 'The one who builds the deliverable or does the technical work', weights: { cs: 3, engineering: 3, 'art-design': 2 } },
      { label: 'The one who organizes the team and keeps everyone on track', weights: { business: 3, management: 3, nursing: 2, communications: 1 } },
      { label: 'The one who presents the final result and fields questions', weights: { communications: 3, polisci: 2, law: 2, business: 1 } },
      { label: 'The one who does deep research and provides the analysis', weights: { economics: 3, biology: 2, psychology: 2, polisci: 1 } },
    ],
  },
  {
    id: 'q6',
    text: 'Which of these headlines would you most likely click on?',
    options: [
      { label: '"The Algorithm That\'s Quietly Reshaping How Cities Plan Traffic"', weights: { cs: 3, engineering: 2, economics: 1 } },
      { label: '"Inside the ER: What Nurses Wish You Knew About Modern Healthcare"', weights: { nursing: 3, biology: 2, psychology: 1 } },
      { label: '"How a Small Design Studio Became the Most Influential Brand Agency"', weights: { 'art-design': 3, communications: 2, business: 2 } },
      { label: '"The Overlooked Economic Policy That Could Change Income Inequality"', weights: { economics: 3, polisci: 3, psychology: 1 } },
    ],
  },
];

/* ──────────────────────── QUIZ SCORING ──────────────────────── */

const reasoningMap: Record<string, string> = {
  cs: 'You show strong systematic thinking and enjoy building things from scratch — traits that thrive in computer science.',
  engineering: 'Your hands-on problem-solving mindset and comfort with technical challenges align well with engineering.',
  business: 'You gravitate toward leadership, strategy, and clear advancement — hallmarks of a business-oriented mind.',
  biology: 'Your patience with detailed study and desire to understand living systems suggests a strong fit for biology.',
  nursing: 'Your empathy, composure under pressure, and desire to help people directly point toward nursing.',
  psychology: 'Your curiosity about why people think and behave the way they do is at the heart of psychology.',
  economics: 'You enjoy analyzing systems, data, and incentives — the building blocks of economic thinking.',
  polisci: 'Your interest in policy, debate, and how institutions shape society aligns with political science.',
  communications: 'You\'re drawn to storytelling, persuasion, and connecting with audiences — core skills in communications.',
  'art-design': 'Your visual thinking and drive for creative expression make art and design a natural fit.',
  finance: 'Your comfort with numbers, risk, and high-stakes decisions points toward a career in finance.',
  management: 'You gravitate toward organizing people, shipping products, and driving outcomes — the heart of management and operations.',
  aviation: 'Your love of precision, focus, and a clear path to mastery fits a career in aviation.',
  law: 'Your skill with argument, analysis, and dense text — and interest in how rules shape society — points toward law.',
};

export function scoreQuiz(answers: number[]): QuizResult[] {
  const totals: Record<string, number> = {};

  answers.forEach((choiceIdx, qIdx) => {
    const q = QUIZ_QUESTIONS[qIdx];
    if (!q || choiceIdx < 0 || choiceIdx >= q.options.length) return;
    const weights = q.options[choiceIdx].weights;
    for (const [majorId, w] of Object.entries(weights)) {
      totals[majorId] = (totals[majorId] || 0) + w;
    }
  });

  return Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([majorId, score]) => ({
      majorId,
      score,
      reasoning: reasoningMap[majorId] || 'This major aligns with several of your quiz responses.',
    }));
}