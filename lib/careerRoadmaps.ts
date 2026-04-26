import { colleges } from './colleges';

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
];

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
      { label: 'Navigating bureaucracy and politics to get approval for a project', weights: { polisci: 3, business: 2, communications: 1, nursing: 1 } },
      { label: 'Memorizing large amounts of detailed, technical material', weights: { biology: 3, nursing: 2, economics: 1, polisci: 1 } },
      { label: 'Having your work critiqued subjectively with no clear "right answer"', weights: { 'art-design': 3, communications: 2, psychology: 2 } },
    ],
  },
  {
    id: 'q4',
    text: 'When choosing between two options, which factor carries more weight for you?',
    options: [
      { label: 'Financial stability and clear advancement milestones', weights: { business: 3, economics: 3, engineering: 2, cs: 1 } },
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
      { label: 'The one who organizes the team and keeps everyone on track', weights: { business: 3, nursing: 2, communications: 1 } },
      { label: 'The one who presents the final result and fields questions', weights: { communications: 3, polisci: 2, business: 1 } },
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