/* ──────────────────────── COLLEGE DATABASE ──────────────────────── */
// Curated database of ~50 colleges with admissions data for the
// Reach / Match / Safety matching engine.

export interface College {
  id: string;
  name: string;
  location: string;
  state: string;
  type: 'Private' | 'Public';
  acceptanceRate: number; // 0-100
  avgGPA: number;         // unweighted 4.0 scale
  satRange: [number, number]; // 25th-75th percentile total SAT
  strengths: string[];
  size: 'Small' | 'Medium' | 'Large';
  logoColor: string;      // tailwind color for UI
}

export type MatchTier = 'safety' | 'match' | 'reach';

export const colleges: College[] = [
  // ─── Ivy League & Ultra-Selective ───
  { id: 'harvard', name: 'Harvard University', location: 'Cambridge, MA', state: 'MA', type: 'Private', acceptanceRate: 3.4, avgGPA: 3.95, satRange: [1480, 1580], strengths: ['Business', 'Law', 'Medicine', 'Liberal Arts'], size: 'Medium', logoColor: 'red' },
  { id: 'stanford', name: 'Stanford University', location: 'Stanford, CA', state: 'CA', type: 'Private', acceptanceRate: 3.7, avgGPA: 3.96, satRange: [1500, 1570], strengths: ['CS', 'Engineering', 'Business', 'AI'], size: 'Medium', logoColor: 'red' },
  { id: 'mit', name: 'MIT', location: 'Cambridge, MA', state: 'MA', type: 'Private', acceptanceRate: 3.9, avgGPA: 3.97, satRange: [1510, 1580], strengths: ['Engineering', 'CS', 'Physics', 'Math'], size: 'Medium', logoColor: 'red' },
  { id: 'yale', name: 'Yale University', location: 'New Haven, CT', state: 'CT', type: 'Private', acceptanceRate: 4.6, avgGPA: 3.94, satRange: [1470, 1570], strengths: ['Law', 'Drama', 'Political Science', 'History'], size: 'Medium', logoColor: 'blue' },
  { id: 'princeton', name: 'Princeton University', location: 'Princeton, NJ', state: 'NJ', type: 'Private', acceptanceRate: 3.5, avgGPA: 3.94, satRange: [1490, 1570], strengths: ['Math', 'Physics', 'Public Policy', 'Engineering'], size: 'Medium', logoColor: 'orange' },
  { id: 'columbia', name: 'Columbia University', location: 'New York, NY', state: 'NY', type: 'Private', acceptanceRate: 3.9, avgGPA: 3.93, satRange: [1480, 1560], strengths: ['Journalism', 'Business', 'Law', 'Film'], size: 'Medium', logoColor: 'blue' },
  { id: 'upenn', name: 'University of Pennsylvania', location: 'Philadelphia, PA', state: 'PA', type: 'Private', acceptanceRate: 5.9, avgGPA: 3.92, satRange: [1470, 1560], strengths: ['Business (Wharton)', 'Finance', 'Nursing', 'Engineering'], size: 'Medium', logoColor: 'blue' },
  { id: 'brown', name: 'Brown University', location: 'Providence, RI', state: 'RI', type: 'Private', acceptanceRate: 5.1, avgGPA: 3.92, satRange: [1460, 1560], strengths: ['Liberal Arts', 'CS', 'Neuroscience', 'Open Curriculum'], size: 'Medium', logoColor: 'red' },
  { id: 'dartmouth', name: 'Dartmouth College', location: 'Hanover, NH', state: 'NH', type: 'Private', acceptanceRate: 6.2, avgGPA: 3.90, satRange: [1440, 1560], strengths: ['Business (Tuck)', 'Liberal Arts', 'Government'], size: 'Small', logoColor: 'green' },
  { id: 'cornell', name: 'Cornell University', location: 'Ithaca, NY', state: 'NY', type: 'Private', acceptanceRate: 7.9, avgGPA: 3.90, satRange: [1430, 1550], strengths: ['Engineering', 'Architecture', 'Hotel Management', 'Agriculture'], size: 'Large', logoColor: 'red' },
  { id: 'caltech', name: 'Caltech', location: 'Pasadena, CA', state: 'CA', type: 'Private', acceptanceRate: 3.2, avgGPA: 3.97, satRange: [1530, 1580], strengths: ['Physics', 'Engineering', 'Chemistry', 'Astronomy'], size: 'Small', logoColor: 'orange' },
  { id: 'uchicago', name: 'University of Chicago', location: 'Chicago, IL', state: 'IL', type: 'Private', acceptanceRate: 5.2, avgGPA: 3.93, satRange: [1480, 1570], strengths: ['Economics', 'Physics', 'Political Science', 'Philosophy'], size: 'Medium', logoColor: 'red' },
  { id: 'duke', name: 'Duke University', location: 'Durham, NC', state: 'NC', type: 'Private', acceptanceRate: 5.0, avgGPA: 3.93, satRange: [1470, 1570], strengths: ['Medicine', 'Public Policy', 'Engineering', 'Basketball'], size: 'Medium', logoColor: 'blue' },
  { id: 'jhu', name: 'Johns Hopkins University', location: 'Baltimore, MD', state: 'MD', type: 'Private', acceptanceRate: 6.5, avgGPA: 3.91, satRange: [1460, 1560], strengths: ['Medicine', 'Public Health', 'Biomedical Engineering', 'International Studies'], size: 'Medium', logoColor: 'blue' },
  { id: 'northwestern', name: 'Northwestern University', location: 'Evanston, IL', state: 'IL', type: 'Private', acceptanceRate: 7.0, avgGPA: 3.90, satRange: [1440, 1550], strengths: ['Journalism', 'Theater', 'Engineering', 'Business'], size: 'Medium', logoColor: 'purple' },
  // ─── Highly Selective (8-20%) ───
  { id: 'vanderbilt', name: 'Vanderbilt University', location: 'Nashville, TN', state: 'TN', type: 'Private', acceptanceRate: 6.7, avgGPA: 3.90, satRange: [1440, 1550], strengths: ['Education', 'Medicine', 'Music', 'Law'], size: 'Medium', logoColor: 'yellow' },
  { id: 'rice', name: 'Rice University', location: 'Houston, TX', state: 'TX', type: 'Private', acceptanceRate: 8.7, avgGPA: 3.90, satRange: [1440, 1560], strengths: ['Engineering', 'Architecture', 'Music', 'CS'], size: 'Small', logoColor: 'blue' },
  { id: 'notredame', name: 'University of Notre Dame', location: 'Notre Dame, IN', state: 'IN', type: 'Private', acceptanceRate: 12.9, avgGPA: 3.88, satRange: [1390, 1520], strengths: ['Business', 'Theology', 'Political Science', 'Engineering'], size: 'Medium', logoColor: 'blue' },
  { id: 'washu', name: 'Washington University in St. Louis', location: 'St. Louis, MO', state: 'MO', type: 'Private', acceptanceRate: 11.0, avgGPA: 3.89, satRange: [1430, 1550], strengths: ['Medicine', 'Business', 'Social Work', 'Biology'], size: 'Medium', logoColor: 'green' },
  { id: 'georgetown', name: 'Georgetown University', location: 'Washington, DC', state: 'DC', type: 'Private', acceptanceRate: 12.0, avgGPA: 3.88, satRange: [1380, 1520], strengths: ['International Relations', 'Law', 'Political Science', 'Business'], size: 'Medium', logoColor: 'blue' },
  { id: 'emory', name: 'Emory University', location: 'Atlanta, GA', state: 'GA', type: 'Private', acceptanceRate: 13.0, avgGPA: 3.87, satRange: [1370, 1510], strengths: ['Business', 'Pre-Med', 'Public Health', 'Psychology'], size: 'Medium', logoColor: 'blue' },
  { id: 'cmu', name: 'Carnegie Mellon University', location: 'Pittsburgh, PA', state: 'PA', type: 'Private', acceptanceRate: 11.0, avgGPA: 3.89, satRange: [1440, 1560], strengths: ['CS', 'Robotics', 'Drama', 'Business'], size: 'Medium', logoColor: 'red' },
  { id: 'usc', name: 'University of Southern California', location: 'Los Angeles, CA', state: 'CA', type: 'Private', acceptanceRate: 12.0, avgGPA: 3.86, satRange: [1360, 1510], strengths: ['Film', 'Business', 'Engineering', 'Communications'], size: 'Large', logoColor: 'red' },
  { id: 'tufts', name: 'Tufts University', location: 'Medford, MA', state: 'MA', type: 'Private', acceptanceRate: 10.0, avgGPA: 3.88, satRange: [1390, 1530], strengths: ['International Relations', 'Pre-Med', 'Engineering', 'CS'], size: 'Medium', logoColor: 'blue' },
  { id: 'nyu', name: 'New York University', location: 'New York, NY', state: 'NY', type: 'Private', acceptanceRate: 12.2, avgGPA: 3.85, satRange: [1350, 1510], strengths: ['Business (Stern)', 'Film', 'Performing Arts', 'Law'], size: 'Large', logoColor: 'purple' },
  // ─── Selective (20-40%) ───
  { id: 'boston_college', name: 'Boston College', location: 'Chestnut Hill, MA', state: 'MA', type: 'Private', acceptanceRate: 16.0, avgGPA: 3.85, satRange: [1350, 1490], strengths: ['Business', 'Nursing', 'Education', 'Theology'], size: 'Medium', logoColor: 'red' },
  { id: 'boston_university', name: 'Boston University', location: 'Boston, MA', state: 'MA', type: 'Private', acceptanceRate: 14.0, avgGPA: 3.82, satRange: [1320, 1490], strengths: ['Communications', 'Business', 'Engineering', 'International Relations'], size: 'Large', logoColor: 'red' },
  { id: 'unc', name: 'UNC Chapel Hill', location: 'Chapel Hill, NC', state: 'NC', type: 'Public', acceptanceRate: 17.0, avgGPA: 3.85, satRange: [1310, 1480], strengths: ['Business', 'Journalism', 'Public Health', 'Biology'], size: 'Large', logoColor: 'blue' },
  { id: 'umich', name: 'University of Michigan', location: 'Ann Arbor, MI', state: 'MI', type: 'Public', acceptanceRate: 18.0, avgGPA: 3.85, satRange: [1320, 1500], strengths: ['Engineering', 'Business (Ross)', 'CS', 'Public Policy'], size: 'Large', logoColor: 'blue' },
  { id: 'uva', name: 'University of Virginia', location: 'Charlottesville, VA', state: 'VA', type: 'Public', acceptanceRate: 19.0, avgGPA: 3.83, satRange: [1310, 1490], strengths: ['Business (Darden)', 'Law', 'Government', 'English'], size: 'Large', logoColor: 'orange' },
  { id: 'gatech', name: 'Georgia Tech', location: 'Atlanta, GA', state: 'GA', type: 'Public', acceptanceRate: 17.0, avgGPA: 3.85, satRange: [1350, 1520], strengths: ['Engineering', 'CS', 'Business', 'Architecture'], size: 'Large', logoColor: 'yellow' },
  { id: 'ucla', name: 'UCLA', location: 'Los Angeles, CA', state: 'CA', type: 'Public', acceptanceRate: 9.0, avgGPA: 3.90, satRange: [1290, 1510], strengths: ['Film', 'Psychology', 'Biology', 'Engineering'], size: 'Large', logoColor: 'blue' },
  { id: 'ucberkeley', name: 'UC Berkeley', location: 'Berkeley, CA', state: 'CA', type: 'Public', acceptanceRate: 11.0, avgGPA: 3.89, satRange: [1310, 1520], strengths: ['CS', 'Engineering', 'Business', 'Environmental Science'], size: 'Large', logoColor: 'blue' },
  // ─── Strong Selective (25-50%) ───
  { id: 'ucsb', name: 'UC Santa Barbara', location: 'Santa Barbara, CA', state: 'CA', type: 'Public', acceptanceRate: 26.0, avgGPA: 3.78, satRange: [1220, 1430], strengths: ['Physics', 'Engineering', 'Environmental Science', 'Film'], size: 'Large', logoColor: 'blue' },
  { id: 'ucdavis', name: 'UC Davis', location: 'Davis, CA', state: 'CA', type: 'Public', acceptanceRate: 37.0, avgGPA: 3.75, satRange: [1170, 1400], strengths: ['Agriculture', 'Veterinary', 'Biology', 'Environmental Science'], size: 'Large', logoColor: 'blue' },
  { id: 'uci', name: 'UC Irvine', location: 'Irvine, CA', state: 'CA', type: 'Public', acceptanceRate: 21.0, avgGPA: 3.80, satRange: [1200, 1430], strengths: ['CS', 'Engineering', 'Nursing', 'Criminology'], size: 'Large', logoColor: 'blue' },
  { id: 'ufl', name: 'University of Florida', location: 'Gainesville, FL', state: 'FL', type: 'Public', acceptanceRate: 23.0, avgGPA: 3.80, satRange: [1300, 1460], strengths: ['Business', 'Engineering', 'Agriculture', 'Journalism'], size: 'Large', logoColor: 'orange' },
  { id: 'utaustin', name: 'UT Austin', location: 'Austin, TX', state: 'TX', type: 'Public', acceptanceRate: 29.0, avgGPA: 3.78, satRange: [1230, 1460], strengths: ['Engineering', 'CS', 'Business', 'Communications'], size: 'Large', logoColor: 'orange' },
  { id: 'uw', name: 'University of Washington', location: 'Seattle, WA', state: 'WA', type: 'Public', acceptanceRate: 44.0, avgGPA: 3.72, satRange: [1200, 1430], strengths: ['CS', 'Medicine', 'Engineering', 'Marine Biology'], size: 'Large', logoColor: 'purple' },
  { id: 'uiuc', name: 'UIUC', location: 'Champaign, IL', state: 'IL', type: 'Public', acceptanceRate: 45.0, avgGPA: 3.70, satRange: [1200, 1430], strengths: ['Engineering', 'CS', 'Business', 'Agriculture'], size: 'Large', logoColor: 'orange' },
  { id: 'purdue', name: 'Purdue University', location: 'West Lafayette, IN', state: 'IN', type: 'Public', acceptanceRate: 49.0, avgGPA: 3.65, satRange: [1180, 1400], strengths: ['Engineering', 'Aviation', 'CS', 'Agriculture'], size: 'Large', logoColor: 'yellow' },
  { id: 'wisc', name: 'UW-Madison', location: 'Madison, WI', state: 'WI', type: 'Public', acceptanceRate: 49.0, avgGPA: 3.68, satRange: [1260, 1440], strengths: ['Engineering', 'Business', 'Biology', 'Political Science'], size: 'Large', logoColor: 'red' },
  { id: 'osu', name: 'Ohio State University', location: 'Columbus, OH', state: 'OH', type: 'Public', acceptanceRate: 53.0, avgGPA: 3.60, satRange: [1190, 1390], strengths: ['Business', 'Engineering', 'Nursing', 'Sports Management'], size: 'Large', logoColor: 'red' },
  { id: 'psu', name: 'Penn State', location: 'State College, PA', state: 'PA', type: 'Public', acceptanceRate: 55.0, avgGPA: 3.55, satRange: [1160, 1370], strengths: ['Engineering', 'Business', 'Agriculture', 'Education'], size: 'Large', logoColor: 'blue' },
  { id: 'umd', name: 'University of Maryland', location: 'College Park, MD', state: 'MD', type: 'Public', acceptanceRate: 42.0, avgGPA: 3.72, satRange: [1270, 1440], strengths: ['CS', 'Engineering', 'Business', 'Journalism'], size: 'Large', logoColor: 'red' },
  { id: 'northeastern', name: 'Northeastern University', location: 'Boston, MA', state: 'MA', type: 'Private', acceptanceRate: 7.0, avgGPA: 3.88, satRange: [1400, 1530], strengths: ['Co-op Programs', 'CS', 'Engineering', 'Business'], size: 'Large', logoColor: 'red' },
  { id: 'case_western', name: 'Case Western Reserve', location: 'Cleveland, OH', state: 'OH', type: 'Private', acceptanceRate: 27.0, avgGPA: 3.78, satRange: [1330, 1490], strengths: ['Engineering', 'Pre-Med', 'Nursing', 'CS'], size: 'Medium', logoColor: 'blue' },
  { id: 'tulane', name: 'Tulane University', location: 'New Orleans, LA', state: 'LA', type: 'Private', acceptanceRate: 11.0, avgGPA: 3.82, satRange: [1310, 1470], strengths: ['Public Health', 'Business', 'Architecture', 'Latin American Studies'], size: 'Medium', logoColor: 'green' },
  { id: 'wake_forest', name: 'Wake Forest University', location: 'Winston-Salem, NC', state: 'NC', type: 'Private', acceptanceRate: 21.0, avgGPA: 3.82, satRange: [1320, 1470], strengths: ['Business', 'Biology', 'Communications', 'Law'], size: 'Medium', logoColor: 'yellow' },
  { id: 'villanova', name: 'Villanova University', location: 'Villanova, PA', state: 'PA', type: 'Private', acceptanceRate: 22.0, avgGPA: 3.78, satRange: [1300, 1450], strengths: ['Business', 'Engineering', 'Nursing', 'Liberal Arts'], size: 'Medium', logoColor: 'blue' },
];
