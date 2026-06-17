/* ══════════════════════════════════════════════════════════════════════
   GRAMMAR CHECK ENGINE
   Detects grammar errors and stylistic optimizations in essay content.
   Returns ranked suggestions with character offsets so the editor can
   render numbered highlights and a sidebar of one-click fixes.

   Priority order: 1) ERRORS first   2) OPTIMIZATIONS second
   ══════════════════════════════════════════════════════════════════════ */

export type IssueSeverity = 'error' | 'optimization';

export type IssueCategory =
  | 'spelling'
  | 'punctuation'
  | 'capitalization'
  | 'agreement'
  | 'spacing'
  | 'article'
  | 'wordiness'
  | 'cliche'
  | 'weak_word'
  | 'passive'
  | 'redundancy'
  | 'contraction'
  | 'repetition'
  | 'confused_word'
  | 'comma_splice'
  | 'run_on'
  | 'fragment'
  | 'nominalization'
  | 'hedging';

export interface GrammarIssue {
  id: string;
  start: number;          // char offset in original text
  end: number;            // exclusive
  original: string;       // original substring
  replacement: string;    // suggested replacement
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;          // short label
  message: string;        // explanation
}

/* ─── Common confused / misspelled words ─── */
const SPELLING_MAP: Array<[RegExp, string, string]> = [
  [/\bteh\b/gi, 'the', 'Common typo for "the".'],
  [/\brecieve(d|s|r)?\b/gi, 'receive$1', '"i" before "e" except after "c".'],
  [/\bdefinately\b/gi, 'definitely', 'Misspelling of "definitely".'],
  [/\bdefinate\b/gi, 'definite', 'Misspelling of "definite".'],
  [/\boccured\b/gi, 'occurred', '"Occurred" is spelled with two r’s.'],
  [/\boccurence(s)?\b/gi, 'occurrence$1', '"Occurrence" has two c’s and two r’s.'],
  [/\bseperat(e|ed|ion)\b/gi, 'separat$1', '"Separate" is spelled with an "a" in the middle.'],
  [/\bbegining\b/gi, 'beginning', '"Beginning" has two n’s.'],
  [/\bbelive(d|s)?\b/gi, 'believe$1', 'Misspelling of "believe".'],
  [/\balot\b/gi, 'a lot', '"A lot" is two words.'],
  [/\balright\b/gi, 'all right', '"All right" is preferred in formal writing.'],
  [/\bwich\b/gi, 'which', 'Did you mean "which"?'],
  [/\bthier\b/gi, 'their', 'Misspelling of "their".'],
  [/\boccassion(s|al|ally)?\b/gi, 'occasion$1', '"Occasion" has two c’s and one s.'],
  [/\baccomodate\b/gi, 'accommodate', '"Accommodate" has two c’s and two m’s.'],
  [/\bembarass(ed|ing|ment)?\b/gi, 'embarrass$1', '"Embarrass" has two r’s and two s’s.'],
  [/\bnoticable\b/gi, 'noticeable', '"Noticeable" keeps the "e".'],
  [/\bgrammer\b/gi, 'grammar', 'Misspelling of "grammar".'],
  [/\bjudgement\b/gi, 'judgment', '"Judgment" is preferred in American English.'],
  [/\baccross\b/gi, 'across', '"Across" has one c.'],
  [/\buntill\b/gi, 'until', '"Until" has one l.'],
  [/\bwierd(ly|ness)?\b/gi, 'weird$1', '"Weird" breaks the "i before e" rule.'],
  [/\btomm?orr?ow\b/gi, 'tomorrow', '"Tomorrow" has one m and two r’s.'],
  [/\bexistance\b/gi, 'existence', '"Existence" ends in -ence.'],
  [/\bperseverence\b/gi, 'perseverance', '"Perseverance" ends in -ance.'],
  [/\bopp?urtunit(y|ies)\b/gi, 'opportunit$1', '"Opportunity" is spelled with two p’s and "or".'],
  [/\bacheive(d|s|ment|ments)?\b/gi, 'achieve$1', '"i" before "e" except after "c" — "achieve".'],
  [/\bsuccesful(ly)?\b/gi, 'successful$1', '"Successful" has two c’s and two s’s.'],
  [/\bsucces\b/gi, 'success', '"Success" ends in double s.'],
  [/\bnecc?ess?ary\b/gi, 'necessary', '"Necessary" has one c and two s’s.'],
  [/\bindependant(ly)?\b/gi, 'independent$1', '"Independent" ends in -ent.'],
  [/\benviroment(al|s)?\b/gi, 'environment$1', '"Environment" has an "n" before the "m".'],
  [/\bgoverment(s)?\b/gi, 'government$1', '"Government" has an "n" before the "m".'],
  [/\bknowlege\b/gi, 'knowledge', '"Knowledge" has a "d" before the "g".'],
  [/\blibary\b/gi, 'library', '"Library" has an "r" after "lib".'],
  [/\brythm(s)?\b/gi, 'rhythm$1', '"Rhythm" is spelled r-h-y-t-h-m.'],
  [/\btruely\b/gi, 'truly', '"Truly" drops the "e" of "true".'],
  [/\barguement(s)?\b/gi, 'argument$1', '"Argument" drops the "e" of "argue".'],
  [/\bcalender(s)?\b/gi, 'calendar$1', '"Calendar" ends in -ar.'],
  [/\bconcious(ly|ness)?\b/gi, 'conscious$1', '"Conscious" is spelled with "sci".'],
  [/\bdissapoint(ed|ing|ment|s)?\b/gi, 'disappoint$1', '"Disappoint" has one s and two p’s.'],
  [/\bfourty\b/gi, 'forty', '"Forty" has no "u".'],
  [/\bharras\b/gi, 'harass', '"Harass" has one r and two s’s.'],
  [/\bharrass(es|ed|ing|ment)?\b/gi, 'harass$1', '"Harass" has one r and two s’s.'],
  [/\bintresting\b/gi, 'interesting', 'Misspelling of "interesting".'],
  [/\blenght\b/gi, 'length', '"Length" ends in -gth.'],
  [/\bmispell(ed|ing)?\b/gi, 'misspell$1', '"Misspell" has two s’s: mis + spell.'],
  [/\bposession(s)?\b/gi, 'possession$1', '"Possession" has two sets of double s.'],
  [/\bprefered\b/gi, 'preferred', '"Preferred" doubles the "r".'],
  [/\brefered\b/gi, 'referred', '"Referred" doubles the "r".'],
  [/\brelevent\b/gi, 'relevant', '"Relevant" ends in -ant.'],
  [/\breligous\b/gi, 'religious', '"Religious" is spelled with "gio".'],
  [/\brepitition(s)?\b/gi, 'repetition$1', '"Repetition" comes from "repeat" — r-e-p-e.'],
  [/\bscince\b/gi, 'science', '"Science" is spelled with "sci".'],
  [/\bsimiliar(ly|ity)?\b/gi, 'similar$1', '"Similar" has no second "i" after the l.'],
  [/\bsincerly\b/gi, 'sincerely', '"Sincerely" keeps the "e" before -ly.'],
  [/\bspeach\b/gi, 'speech', '"Speech" is spelled with double e.'],
  [/\bstrenght(s)?\b/gi, 'strength$1', '"Strength" ends in -gth.'],
  [/\bsuprise(d|s|ing)?\b/gi, 'surprise$1', '"Surprise" has an "r" after "su".'],
  [/\bsuprising(ly)?\b/gi, 'surprising$1', '"Surprising" has an "r" after "su".'],
  [/\btendancy\b/gi, 'tendency', '"Tendency" ends in -ency.'],
  [/\bthreshhold(s)?\b/gi, 'threshold$1', '"Threshold" has one h in the middle.'],
  [/\btounge(s)?\b/gi, 'tongue$1', '"Tongue" is spelled t-o-n-g-u-e.'],
  [/\bvaccuum(s)?\b/gi, 'vacuum$1', '"Vacuum" has one c and two u’s.'],
  [/\bvegtable(s)?\b/gi, 'vegetable$1', '"Vegetable" keeps the middle "e".'],
  [/\bvisable\b/gi, 'visible', '"Visible" ends in -ible.'],
  [/\bwether\b/gi, 'whether', 'Did you mean "whether"?'],
  [/\bwritting\b/gi, 'writing', '"Writing" has one t.'],
  [/\babscence\b/gi, 'absence', '"Absence" has no "c" after "abs".'],
  [/\badress(es|ed|ing)?\b/gi, 'address$1', '"Address" has two d’s.'],
  [/\bbasicly\b/gi, 'basically', '"Basically" ends in -ally.'],
  [/\bpublically\b/gi, 'publicly', '"Publicly" has no -al.'],
  [/\bcomming\b/gi, 'coming', '"Coming" has one m.'],
  [/\bcommitee(s)?\b/gi, 'committee$1', '"Committee" has two m’s, two t’s, and two e’s.'],
  [/\bcompletly\b/gi, 'completely', '"Completely" keeps the "e" before -ly.'],
  [/\bdiffrent(ly)?\b/gi, 'different$1', '"Different" has an "e" after "diff".'],
  [/\bdiscription(s)?\b/gi, 'description$1', '"Description" starts with "de".'],
  [/\bembarassing(ly)?\b/gi, 'embarrassing$1', '"Embarrassing" has two r’s and two s’s.'],
  [/\bfinaly\b/gi, 'finally', '"Finally" has two l’s.'],
  [/\bforiegn(er|ers)?\b/gi, 'foreign$1', '"Foreign" is spelled with "eig".'],
  [/\bfreind(s|ship|ships)?\b/gi, 'friend$1', '"Friend" — "i" before "e".'],
  [/\bgaurd(s|ed|ing|ian|ians)?\b/gi, 'guard$1', '"Guard" is spelled g-u-a-r-d.'],
  [/\bhappend\b/gi, 'happened', '"Happened" ends in -ened.'],
  [/\bimmediatly\b/gi, 'immediately', '"Immediately" keeps the "e" before -ly.'],
  [/\bathiest(s)?\b/gi, 'atheist$1', '"Atheist" is spelled with "the".'],
  [/\bbec(?:uase|asue)\b/gi, 'because', 'Misspelling of "because".'],
  [/\bbuisness(es)?\b/gi, 'business$1', '"Business" comes from "busy" — b-u-s-i.'],
  [/\bcemetary\b/gi, 'cemetery', '"Cemetery" uses only e’s.'],
  [/\bcollegue(s)?\b/gi, 'colleague$1', '"Colleague" is spelled with "ea".'],
  [/\bdilemna(s)?\b/gi, 'dilemma$1', '"Dilemma" has two m’s, no "n".'],
  [/\bexperiance(s|d)?\b/gi, 'experience$1', '"Experience" ends in -ence.'],
  [/\bfamilar\b/gi, 'familiar', '"Familiar" has an "i" before -ar.'],
  [/\bfebuary\b/gi, 'February', '"February" has an "r" after "Feb".'],
  [/\bgu?arentee(d|s)?\b/gi, 'guarantee$1', '"Guarantee" is spelled with "gua" and "tee".'],
  [/\bhygene\b/gi, 'hygiene', '"Hygiene" is spelled with "ie".'],
  [/\bignorence\b/gi, 'ignorance', '"Ignorance" ends in -ance.'],
  [/\bimmitate(d|s)?\b/gi, 'imitate$1', '"Imitate" has one m.'],
  [/\binteligen(t|ce)\b/gi, 'intelligen$1', '"Intelligent" has two l’s.'],
  [/\bliason(s)?\b/gi, 'liaison$1', '"Liaison" has an "i" on each side of the "a".'],
  [/\bmaint(?:ainance|enence)\b/gi, 'maintenance', '"Maintenance" is spelled with "ten".'],
  [/\bmedicene\b/gi, 'medicine', '"Medicine" ends in -cine.'],
  [/\bmillenium(s)?\b/gi, 'millennium$1', '"Millennium" has two l’s and two n’s.'],
  [/\bminiscule\b/gi, 'minuscule', '"Minuscule" comes from "minus".'],
  [/\bmischievious(ly)?\b/gi, 'mischievous$1', '"Mischievous" ends in -vous, not -vious.'],
  [/\bneice(s)?\b/gi, 'niece$1', '"Niece" — "i" before "e".'],
  [/\bnieghbor(s|hood|hoods|ing)?\b/gi, 'neighbor$1', '"Neighbor" is spelled with "eigh".'],
  [/\bnoone\b/gi, 'no one', '"No one" is two words.'],
  [/\bpasttime(s)?\b/gi, 'pastime$1', '"Pastime" has one t in the middle.'],
  [/\bpeice(s)?\b/gi, 'piece$1', '"Piece" — "i" before "e".'],
  [/\bpercieve(d|s)?\b/gi, 'perceive$1', '"i" before "e" except after "c" — "perceive".'],
  [/\bplayw(?:right|rite)(s)?\b/gi, 'playwright$1', 'A "playwright" is spelled like "wright" (a maker).'],
  [/\bpotatoe\b/gi, 'potato', '"Potato" has no final "e" in the singular.'],
  [/\bpreceed(ed|ing|s)?\b/gi, 'preced$1', '"Precede" ends in -cede.'],
  [/\bpreceed\b/gi, 'precede', '"Precede" ends in -cede.'],
  [/\bpronounciation(s)?\b/gi, 'pronunciation$1', '"Pronunciation" drops the second "o" of "pronounce".'],
  [/\bquestionaire(s)?\b/gi, 'questionnaire$1', '"Questionnaire" has two n’s.'],
  [/\brecomend(ed|ing|s|ation|ations)?\b/gi, 'recommend$1', '"Recommend" has one c and two m’s.'],
  [/\brediculous(ly)?\b/gi, 'ridiculous$1', '"Ridiculous" comes from "ridicule" — r-i-d.'],
  [/\bremeber(ed|ing|s)?\b/gi, 'remember$1', 'Misspelling of "remember".'],
  [/\bresistence\b/gi, 'resistance', '"Resistance" ends in -ance.'],
  [/\bresponce(s)?\b/gi, 'response$1', '"Response" ends in -se.'],
  [/\brest(?:araunt|uarant|aurent)(s)?\b/gi, 'restaurant$1', '"Restaurant" is spelled r-e-s-t-a-u-r-a-n-t.'],
  [/\bsecr(?:atary|etery)\b/gi, 'secretary', '"Secretary" contains "secret".'],
  [/\bsieze(d|s)?\b/gi, 'seize$1', '"Seize" is an exception: "e" before "i".'],
  [/\bsupercede(d|s)?\b/gi, 'supersede$1', '"Supersede" is the only English word ending in -sede.'],
  [/\btomatoe\b/gi, 'tomato', '"Tomato" has no final "e" in the singular.'],
  [/\btwelth\b/gi, 'twelfth', '"Twelfth" keeps the "f" of "twelve".'],
  [/\bvehical(s)?\b/gi, 'vehicle$1', '"Vehicle" ends in -cle.'],
  [/\bwen[sd]?sday\b/gi, 'Wednesday', '"Wednesday" is spelled W-e-d-n-e-s-d-a-y.'],
  [/\bwhereever\b/gi, 'wherever', '"Wherever" has one "e" in the middle.'],
  [/\bgreatful(ly|ness)?\b/gi, 'grateful$1', '"Grateful" comes from "gratitude", not "great".'],
  [/\bapparant(ly)?\b/gi, 'apparent$1', '"Apparent" ends in -ent.'],
  [/\bexcercise(d|s|ing)?\b/gi, 'exercise$1', '"Exercise" has one c.'],
  [/\bsupposably\b/gi, 'supposedly', 'The word is "supposedly".'],
  [/\birregardless\b/gi, 'regardless', '"Irregardless" is nonstandard — use "regardless".'],
];

/* ─── Confused word pairs (context-sensitive, conservative) ─── */
interface ConfusedPair { pattern: RegExp; replacement: string; title: string; message: string }

const CONFUSED_PAIRS: ConfusedPair[] = [
  { pattern: /\bits\s+(been|going|getting|important|clear|the\s+\w+)/gi, replacement: "it’s $1", title: 'its → it’s', message: '"It’s" is the contraction of "it is".' },
  { pattern: /\byour\s+(welcome|right|wrong|going|the\s+\w+)/gi, replacement: 'you’re $1', title: 'your → you’re', message: '"You’re" is the contraction of "you are".' },
  { pattern: /\bthere\s+(going|coming|the\s+\w+)/gi, replacement: 'they’re $1', title: 'there → they’re', message: '"They’re" is the contraction of "they are".' },
  { pattern: /\bwould\s+of\b/gi, replacement: 'would have', title: '"would of" → "would have"', message: 'The phrase is "would have", not "would of".' },
  { pattern: /\bcould\s+of\b/gi, replacement: 'could have', title: '"could of" → "could have"', message: 'The phrase is "could have", not "could of".' },
  { pattern: /\bshould\s+of\b/gi, replacement: 'should have', title: '"should of" → "should have"', message: 'The phrase is "should have", not "should of".' },
  { pattern: /\bmust\s+of\b/gi, replacement: 'must have', title: '"must of" → "must have"', message: 'The phrase is "must have", not "must of".' },
  { pattern: /\balot\s+of\b/gi, replacement: 'many', title: '"alot of" → "many"', message: 'Replace with a more precise quantifier.' },
  // affect / effect
  { pattern: /\b(the|an|this|that|its|his|her|their|no|positive|negative|lasting|profound|direct|immediate)\s+affect\b(?!s?\s+(?:on\s+)?change)/gi, replacement: '$1 effect', title: 'affect → effect', message: '"Effect" is the noun (a result); "affect" is the verb (to influence).' },
  { pattern: /\beffect(s|ed)?\s+(me|him|her|us|them|my|our|everyone|people)\b/gi, replacement: 'affect$1 $2', title: 'effect → affect', message: '"Affect" is the verb meaning to influence; "effect" is the noun.' },
  // then / than
  { pattern: /\b(better|worse|more|less|fewer|rather|other|bigger|smaller|faster|slower|stronger|weaker|higher|lower|greater|easier|harder|older|younger|larger|longer|shorter|earlier|sooner|deeper|smarter|brighter)\s+then\b/gi, replacement: '$1 than', title: 'then → than', message: '"Than" makes comparisons; "then" refers to time or sequence.' },
  // loose / lose
  { pattern: /\bloose\s+(the|my|our|his|her|their|your|a|an|sight|track|hope|faith|interest|focus|control|weight)\b/gi, replacement: 'lose $1', title: 'loose → lose', message: '"Lose" means to misplace or fail to win; "loose" means not tight.' },
  { pattern: /\bloosing\b/gi, replacement: 'losing', title: 'loosing → losing', message: '"Losing" comes from "lose"; "loosing" means setting free.' },
  // to / too (guarded: require a degree context before "to")
  { pattern: /\b(is|was|are|were|am|be|been|being|get|gets|got|getting|way|far|much|seemed|seems|felt|feels)\s+to\s+(much|many|late|soon|early|hard|easy|big|small|long|short|fast|slow|often|expensive|difficult|tired|young|old|scared|nervous|busy|loud|quiet)\b/gi, replacement: '$1 too $2', title: 'to → too', message: '"Too" means excessively; "to" is a preposition or part of an infinitive.' },
  // whose / who's
  { pattern: /\bwhose\s+(going|coming|been|getting|gonna)\b/gi, replacement: "who’s $1", title: 'whose → who’s', message: '"Who’s" is the contraction of "who is"; "whose" shows possession.' },
  { pattern: /\bwho'?s\s+(car|house|book|idea|fault|turn|name|story|essay|family|mother|father|dad|mom|life|job|work|dog|cat|team|class|voice|hands?)\b/gi, replacement: 'whose $1', title: 'who’s → whose', message: '"Whose" shows possession; "who’s" means "who is".' },
  // accept / except
  { pattern: /\baccept\s+for\b/gi, replacement: 'except for', title: 'accept → except', message: '"Except" means excluding; "accept" means to receive.' },
  { pattern: /\bexcept\s+(the\s+)?(offer|award|invitation|apology|responsibility|consequences|defeat|help|challenge|role|position)\b/gi, replacement: 'accept $1$2', title: 'except → accept', message: '"Accept" means to receive or agree to; "except" means excluding.' },
  // advice / advise
  { pattern: /\badvice(d|s)?\s+(me|him|her|us|them|you|my|our|people|students)\b/gi, replacement: 'advise$1 $3', title: 'advice → advise', message: '"Advise" is the verb; "advice" is the noun.' },
  { pattern: /\b(an|some|my|your|his|her|their|good|great|sound|piece\s+of|word\s+of)\s+advise\b/gi, replacement: '$1 advice', title: 'advise → advice', message: '"Advice" is the noun; "advise" is the verb.' },
  // passed / past
  { pattern: /\bin\s+the\s+passed\b/gi, replacement: 'in the past', title: 'passed → past', message: '"Past" is the noun for earlier times; "passed" is the verb.' },
  { pattern: /\b(I|he|she|we|they|you)\s+past\s+(the|my|his|her|their|our|a|an)\b/gi, replacement: '$1 passed $2', title: 'past → passed', message: '"Passed" is the past tense of "pass"; "past" is not a verb.' },
  // weather / whether
  { pattern: /\bweather\s+(or\s+not|I|we|he|she|they|you|it|to)\b/gi, replacement: 'whether $1', title: 'weather → whether', message: '"Whether" introduces alternatives; "weather" is rain and sunshine.' },
  // allot / a lot
  { pattern: /\ballot\s+of\b/gi, replacement: 'a lot of', title: 'allot → a lot', message: '"A lot" (two words) means many; "allot" means to assign.' },
  // everyday / every day
  { pattern: /\beveryday\s+(I|we|he|she|they|you|after|before|at|when)\b/gi, replacement: 'every day $1', title: 'everyday → every day', message: '"Every day" (two words) means daily; "everyday" is an adjective meaning ordinary.' },
  { pattern: /\beveryday(?=\s*[.,!?;])/gi, replacement: 'every day', title: 'everyday → every day', message: '"Every day" (two words) means daily; "everyday" is an adjective meaning ordinary.' },
  // apart / a part
  { pattern: /\bapart\s+of\b/gi, replacement: 'a part of', title: 'apart → a part', message: '"A part of" means belonging to; "apart" means separated.' },
  // idiom errors
  { pattern: /\bcould\s+care\s+less\b/gi, replacement: "couldn’t care less", title: '"could care less"', message: 'The idiom is "couldn’t care less" — caring less must be impossible.' },
  { pattern: /\bfor\s+all\s+intensive\s+purposes\b/gi, replacement: 'for all intents and purposes', title: '"intensive purposes"', message: 'The idiom is "for all intents and purposes".' },
  { pattern: /\bshould'?ve\s+went\b/gi, replacement: 'should have gone', title: '"should’ve went"', message: 'After "have", use the past participle: "gone".' },
];

/* ─── Wordy phrases (optimizations) ─── */
const WORDY_PHRASES: Array<[RegExp, string]> = [
  [/\bin\s+order\s+to\b/gi, 'to'],
  [/\bdue\s+to\s+the\s+fact\s+that\b/gi, 'because'],
  [/\bat\s+this\s+point\s+in\s+time\b/gi, 'now'],
  [/\bin\s+spite\s+of\s+the\s+fact\s+that\b/gi, 'although'],
  [/\bin\s+the\s+event\s+that\b/gi, 'if'],
  [/\bfor\s+the\s+purpose\s+of\b/gi, 'for'],
  [/\bwith\s+regard\s+to\b/gi, 'about'],
  [/\bin\s+terms\s+of\b/gi, 'in'],
  [/\ba\s+majority\s+of\b/gi, 'most'],
  [/\bthe\s+fact\s+that\b/gi, 'that'],
  [/\bis\s+able\s+to\b/gi, 'can'],
  [/\bare\s+able\s+to\b/gi, 'can'],
  [/\bhas\s+the\s+ability\s+to\b/gi, 'can'],
  [/\bin\s+my\s+opinion\b/gi, ''],
  [/\bit\s+is\s+important\s+to\s+note\s+that\b/gi, ''],
  [/\bvery\s+unique\b/gi, 'unique'],
  [/\bcompletely\s+eliminate\b/gi, 'eliminate'],
  [/\bend\s+result\b/gi, 'result'],
  [/\bfinal\s+outcome\b/gi, 'outcome'],
  [/\bpast\s+history\b/gi, 'history'],
  [/\bclose\s+proximity\b/gi, 'proximity'],
  [/\beach\s+and\s+every\b/gi, 'every'],
  [/\bfirst\s+and\s+foremost\b/gi, 'first'],
  [/\bnone\s+of\s+the\s+above\b/gi, 'none'],
  [/\bdespite\s+the\s+fact\s+that\b/gi, 'although'],
  [/\bat\s+all\s+times\b/gi, 'always'],
  [/\bon\s+a\s+daily\s+basis\b/gi, 'daily'],
  [/\bin\s+the\s+near\s+future\b/gi, 'soon'],
  [/\bduring\s+the\s+course\s+of\b/gi, 'during'],
  [/\bcame\s+to\s+the\s+realization\s+that\b/gi, 'realized that'],
];

/* ─── Nominalizations (verb buried in a noun phrase) ─── */
interface VerbForms { base: string; s: string; past: string; ing: string }
const NOMINALIZATIONS: Array<{ pattern: RegExp; forms: VerbForms }> = [
  { pattern: /\b(make|makes|made|making)\s+(?:a|the)\s+decisions?\b/gi, forms: { base: 'decide', s: 'decides', past: 'decided', ing: 'deciding' } },
  { pattern: /\b(come|comes|came|coming)\s+to\s+(?:a|the)\s+conclusion\b/gi, forms: { base: 'conclude', s: 'concludes', past: 'concluded', ing: 'concluding' } },
  { pattern: /\b(give|gives|gave|giving)\s+consideration\s+to\b/gi, forms: { base: 'consider', s: 'considers', past: 'considered', ing: 'considering' } },
  { pattern: /\b(take|takes|took|taking)\s+into\s+consideration\b/gi, forms: { base: 'consider', s: 'considers', past: 'considered', ing: 'considering' } },
  { pattern: /\b(conduct|conducts|conducted|conducting)\s+(?:an|the)\s+investigation\b/gi, forms: { base: 'investigate', s: 'investigates', past: 'investigated', ing: 'investigating' } },
  { pattern: /\b(have|has|had|having)\s+a\s+discussion\b/gi, forms: { base: 'discuss', s: 'discusses', past: 'discussed', ing: 'discussing' } },
  { pattern: /\b(reach|reaches|reached|reaching)\s+(?:an|the)\s+agreement\b/gi, forms: { base: 'agree', s: 'agrees', past: 'agreed', ing: 'agreeing' } },
  { pattern: /\b(perform|performs|performed|performing)\s+(?:an|the)\s+analysis\b/gi, forms: { base: 'analyze', s: 'analyzes', past: 'analyzed', ing: 'analyzing' } },
  { pattern: /\b(make|makes|made|making)\s+(?:an|the)\s+assumption\b/gi, forms: { base: 'assume', s: 'assumes', past: 'assumed', ing: 'assuming' } },
  { pattern: /\b(make|makes|made|making)\s+(?:an|the)\s+improvement\s+to\b/gi, forms: { base: 'improve', s: 'improves', past: 'improved', ing: 'improving' } },
];

function conjugateLead(lead: string, forms: VerbForms): string {
  const l = lead.toLowerCase();
  if (l.endsWith('ing')) return forms.ing;
  if (/^(makes|comes|gives|takes|conducts|has|reaches|performs)$/.test(l)) return forms.s;
  if (/^(made|came|gave|took|conducted|had|reached|performed)$/.test(l)) return forms.past;
  return forms.base;
}

/* ─── Cliché phrases ─── */
const CLICHES: RegExp[] = [
  /\bat\s+the\s+end\s+of\s+the\s+day\b/gi,
  /\bthink\s+outside\s+the\s+box\b/gi,
  /\bgive\s+\d*%\s*percent\b/gi,
  /\bgive\s+it\s+my\s+all\b/gi,
  /\bpassion\s+for\s+learning\b/gi,
  /\bever\s+since\s+I\s+was\s+(a\s+)?(little|young|small)\s+(kid|child|girl|boy)\b/gi,
  /\bchanged\s+my\s+life\b/gi,
  /\bmade\s+me\s+who\s+I\s+am\s+today\b/gi,
  /\bin\s+today’?'?s\s+(society|world)\b/gi,
  /\bever\s+since\s+I\s+can\s+remember\b/gi,
  /\bI\s+learned\s+the\s+value\s+of\s+hard\s+work\b/gi,
  /\bpushed\s+me\s+out(side)?\s+of\s+my\s+comfort\s+zone\b/gi,
  /\bstep(ped|ping)?\s+out(side)?\s+of\s+my\s+comfort\s+zone\b/gi,
  /\bfollow\s+my\s+dreams?\b/gi,
  /\bmake\s+a\s+difference\s+in\s+the\s+world\b/gi,
  /\bbroaden(ed|ing)?\s+my\s+horizons\b/gi,
  /\bI\s+have\s+always\s+been\s+fascinated\s+by\b/gi,
  /\blittle\s+did\s+I\s+know\b/gi,
  /\bthe\s+best\s+of\s+both\s+worlds\b/gi,
  /\bwin-win\b/gi,
  /\blast\s+but\s+not\s+least\b/gi,
  /\bin\s+conclusion\b/gi,
  /\bonce\s+in\s+a\s+lifetime\b/gi,
  /\bblood,?\s+sweat,?\s+and\s+tears\b/gi,
  /\bnever\s+give\s+up\b/gi,
  /\blight\s+at\s+the\s+end\s+of\s+the\s+tunnel\b/gi,
];

/* ─── Hedging stacks (doubled uncertainty) ─── */
const HEDGING: RegExp[] = [
  /\bI\s+think\s+that\s+maybe\b/gi,
  /\bI\s+think\s+maybe\b/gi,
  /\bit\s+seems\s+like\s+perhaps\b/gi,
  /\bI\s+(?:kind|sort)\s+of\s+(?:think|feel|believe)\b/gi,
  /\bI\s+guess\s+(?:that\s+)?maybe\b/gi,
  /\bmight\s+possibly\b/gi,
  /\bcould\s+possibly\b/gi,
  /\bperhaps\s+it\s+might\b/gi,
  /\bseems?\s+to\s+(?:kind|sort)\s+of\b/gi,
];

/* ─── Weak intensifiers ─── */
const WEAK_INTENSIFIERS = /\b(very|really|quite|pretty|actually|basically|literally|just|kind\s+of|sort\s+of)\s+(\w+)/gi;

/* ─── a/an article sound exceptions ─── */
// Vowel-letter words pronounced with a consonant sound ("a university")
const YOO_WORDS = new Set([
  'unique','unit','units','united','university','universities','universal','universe',
  'uniform','uniforms','union','unions','unicorn','unicycle','unanimous','unilateral',
  'usual','usually','useful','useless','user','users','use','used','using','usage',
  'utility','utensil','utopia','utopian','ubiquitous','unicode',
  'euro','euros','european','eulogy','euphemism','euphoria','eucalyptus','eureka',
  'one','once','ouija','ewe',
]);
// Consonant-letter words pronounced with a vowel sound ("an hour")
const SILENT_H_WORDS = new Set([
  'hour','hours','hourly','hourglass','honest','honestly','honesty','honor','honors',
  'honored','honorable','honorary','heir','heiress','heirloom','herb','herbs','herbal','homage','hors',
]);

/* ─── Verb lexicon for fragment detection ─── */
const FRAGMENT_VERBS = new Set([
  'is','am','are','was','were','be','been','being','has','have','had',
  'do','does','did','will','would','could','should','can','may','might','must','shall',
  'went','came','said','got','took','made','knew','saw','felt','ran','gave','found',
  'thought','told','became','left','kept','began','brought','wrote','stood','sat',
  'met','paid','heard','let','meant','set','held','spoke','won','lost','grew','drove',
  'ate','drank','slept','woke','fell','flew','threw','caught','taught','bought','sought',
  'go','goes','come','comes','make','makes','take','takes','get','gets','say','says',
  'see','sees','know','knows','think','thinks','feel','feels','want','wants','need','needs',
  'love','loves','hate','hates','believe','believes','realize','realizes','learn','learns',
  'run','runs','walk','walks','look','looks','seem','seems','become','becomes','remain','remains',
  'stay','stays','keep','keeps','hold','holds','turn','turns','start','starts','begin','begins',
  'end','ends','work','works','play','plays','live','lives','mean','means','tell','tells',
  'ask','asks','show','shows','try','tries','call','calls','help','helps','give','gives',
  'find','finds','put','puts','read','reads','write','writes','spend','spends','stand','stands',
]);
const ED_NOUN_EXCEPTIONS = new Set(['hundred','sacred','naked','wicked','hatred','shed','bed','red','wed','sled','tired','beloved','crooked','rugged','jagged','ragged','wretched']);

/* ─── Helpers ─── */
function makeId(start: number, end: number, cat: string): string {
  return `${cat}_${start}_${end}`;
}

function ranges(text: string, regex: RegExp): Array<{ start: number; end: number; match: string; groups: string[] }> {
  const out: Array<{ start: number; end: number; match: string; groups: string[] }> = [];
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, match: m[0], groups: m.slice(1) });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

function applyReplacement(original: string, replacement: string): string {
  // Preserve initial capitalization
  if (!original) return replacement;
  if (original[0] === original[0].toUpperCase() && replacement[0] && replacement[0] !== replacement[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

interface SentenceSpan { start: number; end: number; text: string }

function sentenceSpans(text: string): SentenceSpan[] {
  const out: SentenceSpan[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '.' || ch === '!' || ch === '?' || ch === '\n') {
      while (i + 1 < text.length && /[.!?'")”]/.test(text[i + 1])) i++;
      const slice = text.slice(start, i + 1);
      if (slice.trim().length > 0) out.push({ start, end: i + 1, text: slice });
      start = i + 1;
    }
  }
  const tail = text.slice(start);
  if (tail.trim().length > 0) out.push({ start, end: text.length, text: tail });
  return out;
}

const SUBORDINATORS = /^(?:when|while|because|although|though|if|since|after|before|as|once|until|unless|whenever|where|wherever|even|despite|during|whereas|by|through|without|having|growing|standing|sitting|walking|running|looking)\b/i;
const SPEECH_VERB_BEFORE_COMMA = /\b(?:said|says|replied|asked|whispered|shouted|exclaimed|added|noted|wrote|explained|admitted|thought|realized|remembered|told\s+(?:me|us|him|her|them))\s*$/i;
const CLAUSE_VERB = /\b(?:was|were|is|are|am|had|have|has|went|did|does|felt|knew|saw|made|thought|ran|walked|said|took|got|came|began|started|wanted|needed|loved|hated|decided|realized|learned|stood|sat|told|kept|found|gave|heard|\w{3,}ed)\b/i;

/* ─── Main checker ─── */
export function checkGrammar(text: string): GrammarIssue[] {
  if (!text || text.length < 4) return [];
  const issues: GrammarIssue[] = [];

  /* ─── ERRORS ─── */

  // 1. Spelling
  for (const [pattern, replacement, message] of SPELLING_MAP) {
    for (const r of ranges(text, pattern)) {
      const fixed = r.match.replace(pattern, replacement);
      issues.push({
        id: makeId(r.start, r.end, 'sp'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: applyReplacement(r.match, fixed),
        severity: 'error',
        category: 'spelling',
        title: 'Spelling',
        message,
      });
    }
  }

  // 2. Confused words
  for (const cp of CONFUSED_PAIRS) {
    for (const r of ranges(text, cp.pattern)) {
      const fixed = r.match.replace(cp.pattern, cp.replacement);
      issues.push({
        id: makeId(r.start, r.end, 'cw'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: applyReplacement(r.match, fixed),
        severity: 'error',
        category: 'confused_word',
        title: cp.title,
        message: cp.message,
      });
    }
  }

  // 3. Double space
  for (const r of ranges(text, /  +/g)) {
    issues.push({
      id: makeId(r.start, r.end, 'ds'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: ' ',
      severity: 'error',
      category: 'spacing',
      title: 'Extra spaces',
      message: 'Use a single space between words.',
    });
  }

  // 4. Space before punctuation
  for (const r of ranges(text, /[ \t]+([,.!?;:])/g)) {
    issues.push({
      id: makeId(r.start, r.end, 'sbp'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match.trim(),
      severity: 'error',
      category: 'punctuation',
      title: 'Space before punctuation',
      message: 'Remove the space before punctuation.',
    });
  }

  // 5. Missing space after punctuation (lowercase next letter, not decimal)
  for (const r of ranges(text, /([,.!?;:])([A-Za-z])/g)) {
    // skip decimals like 3.14
    if (/\d/.test(text[r.start - 1] || '') && r.match[0] === '.' && /\d/.test(r.match[1])) continue;
    issues.push({
      id: makeId(r.start, r.end, 'msap'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match[0] + ' ' + r.match[1],
      severity: 'error',
      category: 'spacing',
      title: 'Missing space',
      message: 'Add a space after punctuation.',
    });
  }

  // 6. Double punctuation (!! ?? ,, and exactly two periods, not ellipsis)
  for (const r of ranges(text, /(!{2,}|\?{2,}|,{2,})/g)) {
    issues.push({
      id: makeId(r.start, r.end, 'dp'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match[0],
      severity: 'error',
      category: 'punctuation',
      title: 'Doubled punctuation',
      message: 'One mark is enough in formal writing.',
    });
  }
  for (const r of ranges(text, /\.\.+/g)) {
    if (r.match.length >= 3) continue; // "..." is a legitimate ellipsis
    issues.push({
      id: makeId(r.start, r.end, 'dp2'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: '.',
      severity: 'error',
      category: 'punctuation',
      title: 'Doubled period',
      message: 'Use a single period, or three dots for an ellipsis.',
    });
  }

  // 7. Lowercase "i" as a pronoun
  for (const r of ranges(text, /(^|[^A-Za-z'])i(\s|'|$)/g)) {
    const iPos = r.start + r.match.indexOf('i');
    issues.push({
      id: makeId(iPos, iPos + 1, 'capi'),
      start: iPos,
      end: iPos + 1,
      original: 'i',
      replacement: 'I',
      severity: 'error',
      category: 'capitalization',
      title: 'Capitalize "I"',
      message: 'The pronoun "I" is always capitalized.',
    });
  }

  // 8. Sentence start capitalization (after . ! ?)
  for (const r of ranges(text, /([.!?])\s+([a-z])/g)) {
    const letterPos = r.start + r.match.length - 1;
    issues.push({
      id: makeId(letterPos, letterPos + 1, 'capS'),
      start: letterPos,
      end: letterPos + 1,
      original: r.match[r.match.length - 1],
      replacement: r.match[r.match.length - 1].toUpperCase(),
      severity: 'error',
      category: 'capitalization',
      title: 'Capitalize sentence',
      message: 'Start each sentence with a capital letter.',
    });
  }

  // 9. Subject-verb agreement
  for (const r of ranges(text, /\b(he|she|it)\s+(have|do|go|say|make|know)\b/gi)) {
    const verbMap: Record<string, string> = { have: 'has', do: 'does', go: 'goes', say: 'says', make: 'makes', know: 'knows' };
    const parts = r.match.split(/\s+/);
    const verb = parts[1].toLowerCase();
    const fixed = parts[0] + ' ' + verbMap[verb];
    issues.push({
      id: makeId(r.start, r.end, 'sva'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: fixed,
      severity: 'error',
      category: 'agreement',
      title: 'Subject–verb agreement',
      message: 'Singular subjects need a singular verb form.',
    });
  }
  for (const r of ranges(text, /\b(they|we|you)\s+(has|does|goes|was)\b/gi)) {
    const verbMap: Record<string, string> = { has: 'have', does: 'do', goes: 'go', was: 'were' };
    const parts = r.match.split(/\s+/);
    const fixed = parts[0] + ' ' + verbMap[parts[1].toLowerCase()];
    issues.push({
      id: makeId(r.start, r.end, 'sva2'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: fixed,
      severity: 'error',
      category: 'agreement',
      title: 'Subject–verb agreement',
      message: 'Plural subjects need a plural verb form.',
    });
  }
  for (const r of ranges(text, /\bthere\s+(is|was)\s+(many|several|numerous|multiple|countless|a\s+few|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/gi)) {
    const parts = r.match.split(/\s+/);
    const fixedVerb = parts[1].toLowerCase() === 'is' ? 'are' : 'were';
    const fixed = parts[0] + ' ' + fixedVerb + ' ' + parts.slice(2).join(' ');
    issues.push({
      id: makeId(r.start, r.end, 'sva3'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: fixed,
      severity: 'error',
      category: 'agreement',
      title: '"There is" + plural',
      message: 'A plural quantity after "there" needs a plural verb.',
    });
  }

  // 10. a/an article errors (sound-based, with exception lists)
  for (const r of ranges(text, /\b(a)\s+([a-zA-Z][a-zA-Z-]{1,})\b/g)) {
    const word = r.groups[1];
    if (word === word.toUpperCase()) continue; // acronyms: pronunciation unknown
    const lower = word.toLowerCase();
    const startsVowel = /^[aeiou]/.test(lower);
    const needsAn = (startsVowel && !YOO_WORDS.has(lower)) || SILENT_H_WORDS.has(lower);
    if (!needsAn) continue;
    issues.push({
      id: makeId(r.start, r.end, 'art'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: applyReplacement(r.match, 'an ' + word),
      severity: 'error',
      category: 'article',
      title: '"a" → "an"',
      message: 'Use "an" before a vowel sound.',
    });
  }
  for (const r of ranges(text, /\b(an)\s+([a-zA-Z][a-zA-Z-]{1,})\b/g)) {
    const word = r.groups[1];
    if (word === word.toUpperCase()) continue;
    const lower = word.toLowerCase();
    const startsVowel = /^[aeiou]/.test(lower);
    const needsA = (!startsVowel && !SILENT_H_WORDS.has(lower) && lower !== 'historic' && lower !== 'historical') || YOO_WORDS.has(lower);
    if (!needsA) continue;
    issues.push({
      id: makeId(r.start, r.end, 'art2'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: applyReplacement(r.match, 'a ' + word),
      severity: 'error',
      category: 'article',
      title: '"an" → "a"',
      message: 'Use "a" before a consonant sound.',
    });
  }

  // 11. Comma splice (independent clause + comma + pronoun-led independent clause)
  const sentences = sentenceSpans(text);
  for (const sent of sentences) {
    for (const r of ranges(sent.text, /,\s+(I|he|she|we|they|it)\s+(was|is|am|are|were|had|have|felt|knew|saw|went|did|made|thought)\b/g)) {
      const pre = sent.text.slice(0, r.start).trim();
      if (pre.split(/\s+/).length < 3) continue;
      if (SUBORDINATORS.test(pre)) continue;
      if (SPEECH_VERB_BEFORE_COMMA.test(pre)) continue;
      if (!CLAUSE_VERB.test(pre)) continue;
      const gStart = sent.start + r.start;
      const gEnd = sent.start + r.end;
      const rest = r.match.replace(/^,\s+/, '');
      issues.push({
        id: makeId(gStart, gEnd, 'cs'),
        start: gStart,
        end: gEnd,
        original: r.match,
        replacement: '; ' + rest,
        severity: 'error',
        category: 'comma_splice',
        title: 'Comma splice',
        message: 'Two complete sentences need a semicolon, a period, or a conjunction — not just a comma.',
      });
    }
  }

  // 12. Repeated word ("the the")
  for (const r of ranges(text, /\b(\w+)\s+\1\b/gi)) {
    issues.push({
      id: makeId(r.start, r.end, 'rep'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match.split(/\s+/)[0],
      severity: 'error',
      category: 'repetition',
      title: 'Repeated word',
      message: 'You repeated this word.',
    });
  }

  /* ─── OPTIMIZATIONS ─── */

  // 13. Wordy phrases
  for (const [pattern, replacement] of WORDY_PHRASES) {
    for (const r of ranges(text, pattern)) {
      issues.push({
        id: makeId(r.start, r.end, 'wp'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: replacement || '',
        severity: 'optimization',
        category: 'wordiness',
        title: replacement ? 'Tighten phrasing' : 'Cut filler',
        message: replacement
          ? `Replace with "${replacement}" for clearer prose.`
          : 'This phrase adds words without adding meaning.',
      });
    }
  }

  // 14. Nominalizations
  for (const nom of NOMINALIZATIONS) {
    for (const r of ranges(text, nom.pattern)) {
      const lead = r.groups[0] || '';
      const verb = conjugateLead(lead, nom.forms);
      issues.push({
        id: makeId(r.start, r.end, 'nom'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: applyReplacement(r.match, verb),
        severity: 'optimization',
        category: 'nominalization',
        title: 'Buried verb',
        message: `A single strong verb ("${verb}") is more direct than this noun phrase.`,
      });
    }
  }

  // 15. Clichés
  for (const pat of CLICHES) {
    for (const r of ranges(text, pat)) {
      issues.push({
        id: makeId(r.start, r.end, 'cl'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: r.match,
        severity: 'optimization',
        category: 'cliche',
        title: 'Cliché phrase',
        message: 'Admissions readers see this phrase thousands of times — a specific detail from your own life will stand out more.',
      });
    }
  }

  // 16. Hedging stacks
  for (const pat of HEDGING) {
    for (const r of ranges(text, pat)) {
      issues.push({
        id: makeId(r.start, r.end, 'hg'),
        start: r.start,
        end: r.end,
        original: r.match,
        replacement: r.match,
        severity: 'optimization',
        category: 'hedging',
        title: 'Stacked hedging',
        message: 'Doubling up qualifiers weakens your point — commit to one clear statement.',
      });
    }
  }

  // 17. Passive voice (conservative: requires an explicit "by" phrase)
  for (const r of ranges(text, /\b(was|were|is|are|been|being|am)\s+(\w{3,}(?:ed|en))\s+by\s+(?:the|a|an|my|his|her|their|our|its)\b/gi)) {
    issues.push({
      id: makeId(r.start, r.end, 'pv'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: r.match,
      severity: 'optimization',
      category: 'passive',
      title: 'Passive voice',
      message: 'Active voice is more direct — make the "by" phrase the subject of the sentence.',
    });
  }

  // 18. Weak intensifiers
  for (const r of ranges(text, WEAK_INTENSIFIERS)) {
    const stronger = r.match.replace(WEAK_INTENSIFIERS, '$2');
    issues.push({
      id: makeId(r.start, r.end, 'wi'),
      start: r.start,
      end: r.end,
      original: r.match,
      replacement: stronger,
      severity: 'optimization',
      category: 'weak_word',
      title: 'Weak intensifier',
      message: 'Cut the intensifier or choose a stronger verb/adjective.',
    });
  }

  // 19. Run-on sentences (long + heavily conjoined)
  for (const sent of sentences) {
    const wordCount = sent.text.trim().split(/\s+/).length;
    if (wordCount <= 45) continue;
    const conj = (sent.text.match(/\b(?:and|but|or|so|yet)\b/gi) || []).length;
    if (conj < 3) continue;
    issues.push({
      id: makeId(sent.start, sent.end, 'ro'),
      start: sent.start,
      end: sent.end,
      original: sent.text,
      replacement: sent.text,
      severity: 'optimization',
      category: 'run_on',
      title: 'Run-on sentence',
      message: `This sentence runs ${wordCount} words with ${conj} conjunctions — consider splitting it so each idea lands.`,
    });
  }

  // 20. Sentence fragments (conservative: no recognizable finite verb)
  for (const sent of sentences) {
    const trimmed = sent.text.trim();
    if (trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.endsWith(':')) continue;
    const words = trimmed.toLowerCase().replace(/[^a-z'\s-]/g, ' ').split(/\s+/).filter(w => w.length > 0);
    if (words.length <= 4 || words.length > 14) continue;
    const hasVerb = words.some(w =>
      FRAGMENT_VERBS.has(w) ||
      (w.endsWith('ed') && w.length > 4 && !ED_NOUN_EXCEPTIONS.has(w))
    );
    if (hasVerb) continue;
    issues.push({
      id: makeId(sent.start, sent.end, 'fr'),
      start: sent.start,
      end: sent.end,
      original: sent.text,
      replacement: sent.text,
      severity: 'optimization',
      category: 'fragment',
      title: 'Possible fragment',
      message: 'This may be missing a main verb — if the fragment is intentional for effect, keep it; otherwise attach it to a full sentence.',
    });
  }

  /* ─── Dedupe overlapping ranges (keep highest priority) ─── */
  const sorted = issues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return a.start - b.start;
  });

  const accepted: GrammarIssue[] = [];
  const occupied: Array<[number, number]> = [];
  for (const issue of sorted) {
    const overlaps = occupied.some(([s, e]) => !(issue.end <= s || issue.start >= e));
    if (!overlaps) {
      accepted.push(issue);
      occupied.push([issue.start, issue.end]);
    }
  }

  // Final order: errors first (by position), then optimizations (by position)
  const errors = accepted.filter(i => i.severity === 'error').sort((a, b) => a.start - b.start);
  const opts = accepted.filter(i => i.severity === 'optimization').sort((a, b) => a.start - b.start);
  return [...errors, ...opts];
}

/* ─── Apply a fix to text and return new text + offset delta ─── */
export function applyFix(text: string, issue: GrammarIssue): string {
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}
