/* ══════════════════════════════════════════════════════════════════════
   MAJORS & PROGRAM-STRENGTH MATCHING

   Turns the heatmap from "which schools match my grades" into "which schools
   match my grades AND are actually strong in what I want to study."

   Program strength is resolved in three layers, strongest first:

     1. STANDOUT  — hand-curated. Programs with a genuinely established
                    national reputation in that field.
     2. SOLID     — hand-curated. Well-regarded, frequently a top-25-ish
                    destination for the major without being a household name.
     3. LISTED    — derived from the college's own `strengths` array via each
                    major's match terms.

   When none of the three fire, strength is NULL — deliberately not a number.
   Inventing "Cornell: 74 for Philosophy" from thin air would look like data
   while being a guess, so the UI shows "no program signal" instead and the
   student can still see the school on an admissions-fit basis.

   Curation covers the majors students actually search for. It is not, and
   does not claim to be, an exhaustive ranking of every program in the US.
   ══════════════════════════════════════════════════════════════════════ */

export type MajorCategory =
  | 'stem' | 'health' | 'business' | 'social' | 'humanities'
  | 'arts' | 'education' | 'environment' | 'media';

export interface Major {
  id: string;
  name: string;
  category: MajorCategory;
  /** Values from College.strengths that indicate this major is offered well. */
  terms: string[];
  /** College ids with an established national reputation in this field. */
  standout?: string[];
  /** College ids with a strong, well-regarded program. */
  solid?: string[];
}

export const MAJOR_CATEGORY_LABEL: Record<MajorCategory, string> = {
  stem: 'Science, Tech & Engineering',
  health: 'Health & Medicine',
  business: 'Business & Economics',
  social: 'Social Sciences',
  humanities: 'Humanities',
  arts: 'Arts & Design',
  education: 'Education',
  environment: 'Environment & Agriculture',
  media: 'Media & Communication',
};

export const MAJORS: Major[] = [
  /* ─── STEM ─── */
  {
    id: 'cs', name: 'Computer Science', category: 'stem',
    terms: ['CS', 'AI', 'Cybersecurity', 'Game Design', 'STEM'],
    standout: ['mit', 'stanford', 'cmu', 'ucberkeley', 'uiuc', 'gatech', 'caltech', 'cornell', 'umich', 'utaustin'],
    solid: ['ucla', 'ucsd', 'harvey_mudd', 'princeton', 'harvard', 'uw', 'wisc', 'purdue', 'ucsb', 'umd', 'northeastern', 'usc', 'nyu', 'columbia', 'rice', 'duke', 'jhu', 'brown', 'yale', 'uci', 'osu', 'rpi', 'stonybrook', 'vt', 'ncsu', 'calpolyslo'],
  },
  {
    id: 'data-science', name: 'Data Science & Statistics', category: 'stem',
    terms: ['CS', 'Math', 'STEM', 'AI'],
    standout: ['ucberkeley', 'mit', 'stanford', 'cmu', 'wisc'],
    solid: ['harvard', 'uchicago', 'umich', 'uiuc', 'ucla', 'nyu', 'columbia', 'duke', 'ucdavis', 'psu', 'umn', 'purdue', 'utaustin', 'uw'],
  },
  {
    id: 'engineering-general', name: 'Engineering (General)', category: 'stem',
    terms: ['Engineering', 'STEM'],
    standout: ['mit', 'stanford', 'ucberkeley', 'gatech', 'caltech', 'uiuc', 'umich', 'purdue', 'cmu', 'utaustin'],
    solid: ['cornell', 'ucla', 'ucsd', 'wisc', 'tamu', 'vt', 'psu', 'umd', 'ncsu', 'rpi', 'harvey_mudd', 'jhu', 'northwestern', 'rice', 'usc', 'osu', 'uw', 'ufl', 'colostate', 'wpi', 'stevens', 'lehigh', 'bucknell', 'calpolyslo', 'clemson', 'iastate', 'uiowa'],
  },
  {
    id: 'mechanical-engineering', name: 'Mechanical Engineering', category: 'stem',
    terms: ['Engineering', 'Robotics'],
    standout: ['mit', 'stanford', 'ucberkeley', 'gatech', 'umich', 'purdue', 'caltech', 'uiuc'],
    solid: ['tamu', 'vt', 'psu', 'cornell', 'ucla', 'wisc', 'ncsu', 'osu', 'rpi', 'calpolyslo', 'colostate', 'iastate', 'clemson'],
  },
  {
    id: 'electrical-engineering', name: 'Electrical & Computer Engineering', category: 'stem',
    terms: ['Engineering', 'CS', 'Optics', 'Optical Sciences'],
    standout: ['mit', 'stanford', 'ucberkeley', 'uiuc', 'gatech', 'caltech', 'umich', 'cmu'],
    solid: ['purdue', 'cornell', 'ucla', 'ucsd', 'utaustin', 'tamu', 'psu', 'wisc', 'uw', 'rpi', 'ncsu', 'vt', 'uarizona'],
  },
  {
    id: 'aerospace-engineering', name: 'Aerospace Engineering', category: 'stem',
    terms: ['Aerospace Engineering', 'Engineering'],
    standout: ['mit', 'gatech', 'caltech', 'umich', 'purdue', 'stanford'],
    solid: ['utaustin', 'tamu', 'ucla', 'uiuc', 'psu', 'vt', 'ucsd', 'colostate', 'iastate', 'uarizona', 'rpi'],
  },
  {
    id: 'biomedical-engineering', name: 'Biomedical Engineering', category: 'stem',
    terms: ['Biomedical Engineering', 'Engineering'],
    standout: ['jhu', 'gatech', 'duke', 'mit', 'stanford'],
    solid: ['ucberkeley', 'umich', 'ucsd', 'rice', 'wisc', 'case_western', 'columbia', 'vanderbilt', 'washu', 'boston_university', 'ncsu', 'uiuc'],
  },
  {
    id: 'chemical-engineering', name: 'Chemical Engineering', category: 'stem',
    terms: ['Chemical Engineering', 'Engineering'],
    standout: ['mit', 'ucberkeley', 'stanford', 'caltech', 'utaustin', 'umn'],
    solid: ['wisc', 'gatech', 'purdue', 'uiuc', 'umich', 'princeton', 'tamu', 'psu', 'ncsu', 'lehigh', 'rpi', 'iastate'],
  },
  {
    id: 'civil-engineering', name: 'Civil & Environmental Engineering', category: 'stem',
    terms: ['Engineering', 'Sustainability'],
    standout: ['ucberkeley', 'uiuc', 'gatech', 'stanford', 'mit', 'purdue'],
    solid: ['utaustin', 'vt', 'tamu', 'umich', 'ncsu', 'psu', 'colostate', 'calpolyslo', 'iastate', 'clemson', 'lehigh'],
  },
  {
    id: 'math', name: 'Mathematics', category: 'stem',
    terms: ['Math', 'STEM'],
    standout: ['mit', 'princeton', 'harvard', 'stanford', 'uchicago', 'caltech', 'ucberkeley'],
    solid: ['umich', 'ucla', 'columbia', 'nyu', 'yale', 'wisc', 'uiuc', 'brown', 'cornell', 'harvey_mudd', 'williams', 'carleton', 'reed', 'swarthmore'],
  },
  {
    id: 'physics', name: 'Physics & Astronomy', category: 'stem',
    terms: ['Physics', 'Astronomy', 'STEM', 'Optics'],
    standout: ['mit', 'caltech', 'princeton', 'harvard', 'ucberkeley', 'stanford', 'uchicago'],
    solid: ['cornell', 'columbia', 'umich', 'ucsb', 'uiuc', 'wisc', 'ucla', 'uarizona', 'reed', 'harvey_mudd', 'carleton', 'williams', 'stonybrook'],
  },
  {
    id: 'chemistry', name: 'Chemistry', category: 'stem',
    terms: ['Chemistry', 'STEM'],
    standout: ['ucberkeley', 'mit', 'caltech', 'harvard', 'stanford'],
    solid: ['uiuc', 'wisc', 'northwestern', 'columbia', 'uchicago', 'umich', 'purdue', 'utaustin', 'ucla', 'grinnell', 'carleton'],
  },
  {
    id: 'robotics', name: 'Robotics & Mechatronics', category: 'stem',
    terms: ['Robotics', 'Engineering', 'CS'],
    standout: ['cmu', 'mit', 'gatech', 'stanford'],
    solid: ['umich', 'ucberkeley', 'purdue', 'wpi', 'jhu', 'uiuc', 'calpolyslo'],
  },
  {
    id: 'geology', name: 'Geology & Earth Sciences', category: 'stem',
    terms: ['Geology', 'Earth Sciences', 'Oceanography', 'Meteorology'],
    standout: ['caltech', 'mit', 'stanford', 'colostate'],
    solid: ['ucberkeley', 'uarizona', 'psu', 'utaustin', 'cuboulder', 'uw', 'colorado_college', 'uoklahoma'],
  },

  /* ─── HEALTH ─── */
  {
    id: 'nursing', name: 'Nursing', category: 'health',
    terms: ['Nursing', 'Health Sciences'],
    standout: ['upenn', 'jhu', 'umich', 'unc', 'uw'],
    solid: ['ucla', 'pitt', 'nyu', 'boston_college', 'villanova', 'case_western', 'emory', 'marquette', 'creighton', 'seton_hall', 'usd', 'uiowa', 'msu', 'osu', 'uconn', 'udel', 'clemson', 'byu'],
  },
  {
    id: 'pre-med', name: 'Pre-Med / Biology', category: 'health',
    terms: ['Pre-Med', 'Biology', 'Medicine', 'Neuroscience', 'Health Sciences'],
    standout: ['jhu', 'harvard', 'stanford', 'duke', 'washu', 'ucberkeley'],
    solid: ['umich', 'ucla', 'unc', 'vanderbilt', 'emory', 'cornell', 'brown', 'case_western', 'pitt', 'ucsd', 'wisc', 'ufl', 'tulane', 'boston_university', 'rochester', 'creighton', 'holy_cross', 'davidson'],
  },
  {
    id: 'public-health', name: 'Public Health', category: 'health',
    terms: ['Public Health', 'Health Sciences', 'Medicine'],
    standout: ['jhu', 'harvard', 'unc', 'umich', 'ucberkeley'],
    solid: ['emory', 'ucla', 'columbia', 'boston_university', 'tulane', 'uw', 'brown', 'gw', 'usf', 'ufl'],
  },
  {
    id: 'neuroscience', name: 'Neuroscience', category: 'health',
    terms: ['Neuroscience', 'Biology', 'Psychology'],
    standout: ['mit', 'harvard', 'stanford', 'jhu', 'ucberkeley'],
    solid: ['brown', 'duke', 'washu', 'ucla', 'umich', 'vanderbilt', 'pitt', 'rochester', 'oberlin', 'colby'],
  },
  {
    id: 'pharmacy', name: 'Pharmacy & Pharmaceutical Sciences', category: 'health',
    terms: ['Pharmacy', 'Health Sciences'],
    standout: ['unc', 'ucsd', 'purdue', 'umn'],
    solid: ['pitt', 'osu', 'wisc', 'uiowa', 'uky', 'creighton', 'temple', 'drexel', 'usf'],
  },
  {
    id: 'veterinary', name: 'Veterinary & Animal Science', category: 'health',
    terms: ['Veterinary', 'Agriculture', 'Biology'],
    standout: ['ucdavis', 'cornell', 'colostate', 'ncsu'],
    solid: ['tamu', 'uga', 'purdue', 'osu', 'iastate', 'umn', 'wisc', 'uky'],
  },
  {
    id: 'kinesiology', name: 'Kinesiology & Sports Science', category: 'health',
    terms: ['Health Sciences', 'Sports Management'],
    standout: ['umich', 'utaustin', 'psu'],
    solid: ['uga', 'ufl', 'indiana', 'osu', 'uconn', 'oregonstate', 'uoregon', 'tcu'],
  },

  /* ─── BUSINESS ─── */
  {
    id: 'business', name: 'Business Administration', category: 'business',
    terms: ['Business', 'Business (Wharton)', 'Business (Ross)', 'Business (Stern)', 'Business (Kelley)', 'Business (Tuck)', 'Business (Darden)', 'Business (Robins)', 'International Business'],
    standout: ['upenn', 'umich', 'ucberkeley', 'nyu', 'indiana', 'utaustin', 'unc', 'uva', 'mit', 'usc'],
    solid: ['cmu', 'washu', 'emory', 'notredame', 'georgetown', 'boston_college', 'villanova', 'wisc', 'osu', 'psu', 'umn', 'uga', 'ufl', 'tamu', 'smu', 'fordham', 'bucknell', 'lehigh', 'santa_clara', 'tcu', 'baylor', 'marquette', 'byu', 'umd', 'pitt'],
  },
  {
    id: 'finance', name: 'Finance', category: 'business',
    terms: ['Finance', 'Business', 'Business (Wharton)', 'Business (Stern)', 'Economics'],
    standout: ['upenn', 'nyu', 'umich', 'utaustin', 'uva'],
    solid: ['boston_college', 'notredame', 'villanova', 'fordham', 'georgetown', 'indiana', 'unc', 'usc', 'washu', 'lehigh', 'bucknell', 'smu', 'baylor', 'tcu', 'santa_clara'],
  },
  {
    id: 'accounting', name: 'Accounting', category: 'business',
    terms: ['Accounting', 'Business'],
    standout: ['utaustin', 'uiuc', 'byu', 'notredame'],
    solid: ['indiana', 'umich', 'usc', 'osu', 'psu', 'wisc', 'uga', 'ufl', 'villanova', 'boston_college', 'fordham', 'marquette', 'baylor'],
  },
  {
    id: 'economics', name: 'Economics', category: 'business',
    terms: ['Economics', 'Business'],
    standout: ['harvard', 'mit', 'uchicago', 'princeton', 'stanford', 'ucberkeley', 'yale'],
    solid: ['northwestern', 'columbia', 'nyu', 'upenn', 'umich', 'duke', 'ucla', 'wisc', 'williams', 'amherst', 'swarthmore', 'pomona', 'cmc', 'middlebury', 'colgate', 'macalester', 'grinnell'],
  },
  {
    id: 'marketing', name: 'Marketing', category: 'business',
    terms: ['Business', 'Communications'],
    standout: ['upenn', 'umich', 'indiana', 'nyu'],
    solid: ['utaustin', 'wisc', 'osu', 'psu', 'uga', 'smu', 'syracuse', 'fordham', 'depaul', 'chapman'],
  },
  {
    id: 'supply-chain', name: 'Supply Chain & Operations', category: 'business',
    terms: ['Supply Chain', 'Business', 'Logistics'],
    standout: ['msu', 'psu', 'mit'],
    solid: ['tamu', 'osu', 'purdue', 'umich', 'utk', 'asu', 'wisc', 'lehigh'],
  },
  {
    id: 'hospitality', name: 'Hospitality & Hotel Management', category: 'business',
    terms: ['Hospitality', 'Hotel Management', 'Business'],
    standout: ['cornell'],
    solid: ['usf', 'ucf', 'psu', 'purdue', 'msu', 'depaul', 'uhawaii'],
  },
  {
    id: 'entrepreneurship', name: 'Entrepreneurship & Innovation', category: 'business',
    terms: ['Innovation', 'Business', 'Entrepreneurship'],
    standout: ['stanford', 'mit', 'upenn'],
    solid: ['ucberkeley', 'usc', 'nyu', 'umich', 'northeastern', 'santa_clara', 'chapman', 'byu', 'smu'],
  },

  /* ─── SOCIAL SCIENCES ─── */
  {
    id: 'political-science', name: 'Political Science & Government', category: 'social',
    terms: ['Political Science', 'Government', 'Politics', 'Public Affairs', 'Policy'],
    standout: ['harvard', 'princeton', 'stanford', 'georgetown', 'yale', 'uchicago'],
    solid: ['umich', 'ucberkeley', 'columbia', 'duke', 'ucla', 'gw', 'american', 'wisc', 'unc', 'uva', 'williams', 'amherst', 'swarthmore', 'wesleyan', 'colgate', 'macalester'],
  },
  {
    id: 'international-relations', name: 'International Relations', category: 'social',
    terms: ['International Relations', 'International Studies', 'International Affairs', 'Diplomacy', 'Government'],
    standout: ['georgetown', 'jhu', 'harvard', 'princeton', 'tufts'],
    solid: ['gw', 'american', 'columbia', 'uchicago', 'stanford', 'ucberkeley', 'middlebury', 'macalester', 'wesleyan', 'boston_university'],
  },
  {
    id: 'psychology', name: 'Psychology', category: 'social',
    terms: ['Psychology', 'Neuroscience'],
    standout: ['stanford', 'harvard', 'ucberkeley', 'umich', 'yale'],
    solid: ['ucla', 'uiuc', 'wisc', 'unc', 'nyu', 'psu', 'osu', 'umn', 'vanderbilt', 'washu', 'uva', 'ufl', 'asu', 'reed', 'oberlin', 'vassar', 'wesleyan'],
  },
  {
    id: 'sociology', name: 'Sociology & Anthropology', category: 'social',
    terms: ['Sociology', 'Anthropology', 'Latin American Studies', 'Native American Studies'],
    standout: ['ucberkeley', 'uchicago', 'harvard', 'princeton', 'umich'],
    solid: ['wisc', 'ucla', 'unc', 'nyu', 'columbia', 'uarizona', 'macalester', 'grinnell', 'oberlin', 'reed', 'uhawaii'],
  },
  {
    id: 'criminal-justice', name: 'Criminal Justice & Criminology', category: 'social',
    terms: ['Criminal Justice', 'Criminology', 'Law'],
    standout: ['umd', 'uci'],
    solid: ['psu', 'asu', 'temple', 'american', 'fsu', 'ucf', 'usf', 'gmu', 'jmu', 'loyola_chicago'],
  },
  {
    id: 'public-policy', name: 'Public Policy & Administration', category: 'social',
    terms: ['Public Policy', 'Policy', 'Public Affairs', 'Government'],
    standout: ['princeton', 'harvard', 'georgetown', 'indiana', 'umich'],
    solid: ['ucberkeley', 'duke', 'uchicago', 'gw', 'american', 'ucla', 'syracuse', 'umd', 'wisc'],
  },
  {
    id: 'pre-law', name: 'Pre-Law & Legal Studies', category: 'social',
    terms: ['Law', 'Political Science', 'Ethics', 'Government'],
    standout: ['harvard', 'yale', 'stanford', 'uchicago', 'columbia'],
    solid: ['georgetown', 'nyu', 'upenn', 'duke', 'umich', 'uva', 'unc', 'williams', 'amherst', 'wandl', 'holy_cross', 'american'],
  },

  /* ─── HUMANITIES ─── */
  {
    id: 'english', name: 'English & Literature', category: 'humanities',
    terms: ['English', 'Creative Writing', 'Writing', 'Humanities', 'Liberal Arts'],
    standout: ['harvard', 'yale', 'princeton', 'uchicago', 'columbia', 'uiowa'],
    solid: ['ucberkeley', 'umich', 'brown', 'stanford', 'williams', 'amherst', 'swarthmore', 'kenyon', 'oberlin', 'vassar', 'wesleyan', 'bates', 'colby', 'grinnell', 'reed', 'davidson'],
  },
  {
    id: 'creative-writing', name: 'Creative Writing', category: 'humanities',
    terms: ['Creative Writing', 'Writing', 'Writing (Iowa Writers Workshop)', 'English'],
    standout: ['uiowa', 'kenyon', 'oberlin', 'brown'],
    solid: ['columbia', 'nyu', 'emory', 'washu', 'hamilton', 'bates', 'vassar', 'wesleyan', 'colorado_college'],
  },
  {
    id: 'history', name: 'History', category: 'humanities',
    terms: ['History', 'Humanities', 'Liberal Arts'],
    standout: ['harvard', 'yale', 'princeton', 'uchicago', 'ucberkeley'],
    solid: ['columbia', 'umich', 'stanford', 'unc', 'wisc', 'williams', 'amherst', 'swarthmore', 'bowdoin', 'wandl', 'holy_cross', 'davidson'],
  },
  {
    id: 'philosophy', name: 'Philosophy', category: 'humanities',
    terms: ['Philosophy', 'Ethics', 'Humanities', 'Theology'],
    standout: ['princeton', 'nyu', 'harvard', 'ucberkeley', 'uchicago'],
    solid: ['yale', 'stanford', 'umich', 'columbia', 'notredame', 'brown', 'reed', 'williams', 'amherst', 'swarthmore', 'holy_cross', 'byu'],
  },
  {
    id: 'linguistics', name: 'Linguistics & Languages', category: 'humanities',
    terms: ['Linguistics', 'Languages', 'Humanities'],
    standout: ['mit', 'ucberkeley', 'stanford', 'umass'],
    solid: ['uchicago', 'ucla', 'umich', 'nyu', 'uarizona', 'ucsd', 'middlebury', 'reed', 'uhawaii'],
  },
  {
    id: 'classics', name: 'Classics & Religious Studies', category: 'humanities',
    terms: ['Theology', 'Humanities', 'Liberal Arts', 'Ethics'],
    standout: ['princeton', 'harvard', 'yale', 'notredame'],
    solid: ['uchicago', 'columbia', 'brown', 'holy_cross', 'williams', 'kenyon', 'davidson', 'byu', 'baylor', 'loyola_chicago'],
  },

  /* ─── ARTS & DESIGN ─── */
  {
    id: 'art-design', name: 'Art & Design', category: 'arts',
    terms: ['Design', 'Art History', 'Performing Arts', 'Textiles'],
    standout: ['yale', 'ucla', 'cmu'],
    solid: ['nyu', 'usc', 'umich', 'washu', 'syracuse', 'chapman', 'ncsu', 'temple', 'depaul', 'oberlin', 'bates'],
  },
  {
    id: 'architecture', name: 'Architecture', category: 'arts',
    terms: ['Architecture', 'Design'],
    standout: ['cornell', 'mit', 'rice', 'calpolyslo', 'gatech'],
    solid: ['ucberkeley', 'columbia', 'usc', 'umich', 'utaustin', 'syracuse', 'rpi', 'tulane', 'iastate', 'clemson', 'uoregon'],
  },
  {
    id: 'music', name: 'Music & Performance', category: 'arts',
    terms: ['Music', 'Music (Conservatory)', 'Music (Eastman)', 'Performing Arts'],
    standout: ['rochester', 'oberlin', 'indiana', 'northwestern', 'usc'],
    solid: ['umich', 'yale', 'rice', 'vanderbilt', 'depaul', 'temple', 'byu', 'chapman', 'boston_university'],
  },
  {
    id: 'theater', name: 'Theater & Drama', category: 'arts',
    terms: ['Drama', 'Theater', 'Performing Arts'],
    standout: ['yale', 'cmu', 'nyu', 'northwestern'],
    solid: ['usc', 'ucla', 'boston_university', 'syracuse', 'depaul', 'temple', 'chapman', 'fordham', 'oberlin', 'vassar'],
  },
  {
    id: 'film', name: 'Film & Media Production', category: 'arts',
    terms: ['Film', 'Communications', 'Communications (Newhouse)'],
    standout: ['usc', 'nyu', 'ucla', 'chapman'],
    solid: ['northwestern', 'boston_university', 'syracuse', 'depaul', 'temple', 'fsu', 'lmu', 'wesleyan'],
  },

  /* ─── MEDIA & COMMUNICATION ─── */
  {
    id: 'journalism', name: 'Journalism', category: 'media',
    terms: ['Journalism', 'Communications', 'Communications (Newhouse)', 'Writing'],
    standout: ['northwestern', 'syracuse', 'umissouri'],
    solid: ['nyu', 'usc', 'boston_university', 'unc', 'utaustin', 'indiana', 'american', 'gw', 'asu', 'uga', 'ufl', 'temple'],
  },
  {
    id: 'communications', name: 'Communications & Media Studies', category: 'media',
    terms: ['Communications', 'Communications (Newhouse)', 'Journalism', 'Film'],
    standout: ['usc', 'northwestern', 'upenn', 'syracuse'],
    solid: ['nyu', 'boston_university', 'ucsb', 'utaustin', 'uga', 'ufl', 'american', 'depaul', 'chapman', 'elon', 'temple', 'fordham'],
  },
  {
    id: 'marketing-pr', name: 'Public Relations & Advertising', category: 'media',
    terms: ['Communications', 'Communications (Newhouse)', 'Business'],
    standout: ['syracuse', 'utaustin', 'uga'],
    solid: ['boston_university', 'usc', 'american', 'ufl', 'elon', 'depaul', 'temple', 'chapman', 'smu'],
  },

  /* ─── EDUCATION ─── */
  {
    id: 'education', name: 'Education & Teaching', category: 'education',
    terms: ['Education', 'Social Work'],
    standout: ['vanderbilt', 'umich', 'wisc', 'ucla', 'columbia'],
    solid: ['msu', 'osu', 'utaustin', 'indiana', 'psu', 'uga', 'ufl', 'jmu', 'elon', 'byu', 'baylor', 'holy_cross'],
  },
  {
    id: 'social-work', name: 'Social Work & Human Services', category: 'education',
    terms: ['Social Work', 'Psychology', 'Public Health'],
    standout: ['umich', 'washu', 'columbia', 'unc'],
    solid: ['ucberkeley', 'ucla', 'nyu', 'boston_college', 'fordham', 'temple', 'loyola_chicago', 'usf', 'uga'],
  },

  /* ─── ENVIRONMENT & AGRICULTURE ─── */
  {
    id: 'environmental-science', name: 'Environmental Science & Sustainability', category: 'environment',
    terms: ['Environmental Science', 'Environmental Studies', 'Sustainability', 'Ecology', 'Forestry', 'Energy'],
    standout: ['ucberkeley', 'yale', 'ucdavis', 'colostate', 'duke'],
    solid: ['ucsb', 'umich', 'wisc', 'cuboulder', 'oregonstate', 'uvm', 'middlebury', 'colorado_college', 'whitman', 'unh', 'psu', 'ncsu'],
  },
  {
    id: 'agriculture', name: 'Agriculture & Food Science', category: 'environment',
    terms: ['Agriculture', 'Tropical Agriculture', 'Entomology', 'Forestry'],
    standout: ['ucdavis', 'cornell', 'tamu', 'iastate', 'purdue'],
    solid: ['wisc', 'umn', 'ncsu', 'uga', 'osu', 'psu', 'colostate', 'uky', 'uark', 'lsu', 'oregonstate', 'uhawaii', 'msu'],
  },
  {
    id: 'marine-biology', name: 'Marine & Ocean Sciences', category: 'environment',
    terms: ['Marine Biology', 'Marine Science', 'Marine Sciences', 'Oceanography', 'Ecology'],
    standout: ['ucsd', 'uhawaii', 'umiami', 'oregonstate'],
    solid: ['ucsb', 'ucsc', 'unc', 'usf', 'fsu', 'stonybrook', 'uw', 'ncsu'],
  },
];

/* ─── lookup helpers ───────────────────────────────────────────────── */

const BY_ID = new Map(MAJORS.map(m => [m.id, m]));

export function getMajor(id: string | null | undefined): Major | null {
  return id ? BY_ID.get(id) || null : null;
}

/** Majors grouped by category, for a grouped <select>. */
export function majorsByCategory(): { category: MajorCategory; label: string; majors: Major[] }[] {
  const order: MajorCategory[] = ['stem', 'health', 'business', 'social', 'humanities', 'arts', 'media', 'education', 'environment'];
  return order.map(category => ({
    category,
    label: MAJOR_CATEGORY_LABEL[category],
    majors: MAJORS.filter(m => m.category === category).sort((a, b) => a.name.localeCompare(b.name)),
  })).filter(g => g.majors.length > 0);
}

export type ProgramTier = 'standout' | 'strong' | 'offered' | 'unknown';

export interface ProgramMatch {
  tier: ProgramTier;
  /** 0-100 where a signal exists, null where we genuinely have no data. */
  score: number | null;
  label: string;
}

const TIER_META: Record<ProgramTier, { score: number | null; label: string }> = {
  standout: { score: 100, label: 'Standout program' },
  strong:   { score: 82,  label: 'Strong program' },
  offered:  { score: 64,  label: 'Listed strength' },
  unknown:  { score: null, label: 'No program data' },
};

/**
 * How strong is this college in this major?
 * Returns tier 'unknown' rather than a fabricated number when we have no
 * basis — see the note at the top of this file.
 */
export function programMatch(collegeId: string, collegeStrengths: string[], major: Major | null): ProgramMatch {
  if (!major) return { tier: 'unknown', ...TIER_META.unknown };
  if (major.standout?.includes(collegeId)) return { tier: 'standout', ...TIER_META.standout };
  if (major.solid?.includes(collegeId)) return { tier: 'strong', ...TIER_META.strong };
  const listed = collegeStrengths.some(s => major.terms.includes(s));
  if (listed) return { tier: 'offered', ...TIER_META.offered };
  return { tier: 'unknown', ...TIER_META.unknown };
}
