/* ══════════════════════════════════════════════════════════════════════
   SAMPLE ESSAYS DATABASE — AdmitsOnly
   ══════════════════════════════════════════════════════════════════════
   Authentic benchmark essays across all major prompt types.
   Used for scoring calibration, example browsing, and writing guidance.

   Each essay includes:
   - The prompt it responds to
   - Full essay text (written in authentic student voice)
   - Scoring rubric breakdown
   - Admissions officer commentary
   - Tags for searchability
   ══════════════════════════════════════════════════════════════════════ */

import type { PromptType } from './schoolData';

export interface ScoringRubric {
  authenticity: number;      // 1-10: Does it feel like a real student wrote this?
  storytelling: number;      // 1-10: Narrative arc, scene-setting, pacing
  selfReflection: number;    // 1-10: Depth of insight about oneself
  specificity: number;       // 1-10: Concrete details vs vague generalizations
  promptAlignment: number;   // 1-10: How well it answers the actual question
  writing: number;           // 1-10: Prose quality, voice, word choice
  overall: number;           // 1-10: Holistic admissions strength
}

export interface SampleEssay {
  id: string;
  title: string;
  promptType: PromptType;
  prompt: string;
  schoolContext?: string;     // Which school/prompt this responds to (if supplemental)
  wordCount: number;
  essay: string;
  scoring: ScoringRubric;
  aoCommentary: string;       // What an admissions officer would say
  strengths: string[];
  improvements: string[];
  tags: string[];
  tier: 'exceptional' | 'strong' | 'good' | 'needs_work';
}

/* ─── EXCEPTIONAL TIER (9-10 overall) ─── */

const ESSAY_PERSONAL_STATEMENT_1: SampleEssay = {
  id: 'sample-ps-1',
  title: 'The Mango Cart',
  promptType: 'identity',
  prompt: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.',
  wordCount: 648,
  essay: `Every Saturday morning, my grandmother wakes up at 4 AM to push a wooden cart three miles to the Mercado Municipal in our neighborhood. She sells mangoes — sliced, with tajín and lime — for two dollars each. I've been her assistant since I was seven.

People think of mango carts as quaint. Charming. Something you see on a postcard from Mexico City and think "how authentic." But there is nothing charming about standing in 97-degree heat for nine hours with aching feet, watching tourists haggle you down from two dollars to one-fifty because they think your labor is negotiable.

I learned to do mental math in three currencies before I learned long division. I learned customer service before I learned cursive. My grandmother would nudge me forward — "dile el precio, mija" — and I'd quote the price in English to the gringos, in Spanish to the abuelas, in the weird Spanglish hybrid to the teenagers from my school who pretended not to see me there.

That pretending was the part that stung. Monday mornings, Keyla and Daniela would talk about their weekends — the mall, the movies, someone's quinceañera. And I'd sit there with tajín still under my fingernails, wondering if the mango smell had really faded from my hair or if I was just used to it.

For a while, I was ashamed. Freshman year, I told people my weekend job was "helping with a family business." That sounded better. More American. More like something you'd put on a college application under "entrepreneurial experience." I scrubbed the cart out of my story and replaced it with something cleaner.

The shift happened junior year, in AP Environmental Science. We were studying food deserts, and I raised my hand before I could stop myself. "My grandmother's cart is the only place in a six-block radius where you can buy fresh fruit," I said. The room got quiet, and for a second I wished I'd kept my mouth shut. But then Mr. Dominguez asked me to keep going, and something unlocked.

I started researching mobile food access in low-income neighborhoods. I mapped every vendor within a two-mile radius of our apartment using Google Earth and a notebook. Fourteen carts. Fourteen families supplementing what corner stores couldn't provide. I turned it into my APES final project and then into a proposal for our city councilwoman's office, arguing that street vendors should be included in municipal food access planning rather than fined out of existence.

The councilwoman's aide called it "surprisingly thorough for a high school student." My grandmother called it "finally, someone listens." I think both of them were right, in different ways.

I still work the cart. Last Saturday, a woman asked if we took Venmo, and my grandmother looked at me like I'd suggested we sell the mangoes on Mars. We compromised: I made a handwritten sign that says "Cash or Venmo" with a QR code, taped next to my grandmother's hand-painted price list. Old world and new, side by side, held together with packing tape.

That's the thing about growing up between worlds — you don't choose one. You learn to hold both, to translate not just languages but entire ways of seeing. My grandmother sees the cart as survival. I see it as that, plus data, plus policy, plus potential. Neither of us is wrong.

I don't scrub the cart from my story anymore. It is my story — tajín-stained fingernails and all.`,
  scoring: {
    authenticity: 10,
    storytelling: 10,
    selfReflection: 9,
    specificity: 10,
    promptAlignment: 9,
    writing: 10,
    overall: 10,
  },
  aoCommentary: 'This is the kind of essay that stops you mid-read. The specificity is extraordinary — "tajín still under my fingernails," "dile el precio, mija" — these details can\'t be faked. The arc from shame to ownership to advocacy is perfectly paced, and the policy pivot feels organic rather than forced. The ending image of the handwritten Venmo sign is unforgettable. This student has voice, grit, and intellectual curiosity.',
  strengths: [
    'Extraordinary sensory detail that grounds every scene',
    'Natural character arc from shame to pride without being preachy',
    'Bridges personal story to intellectual pursuit seamlessly',
    'Authentic bilingual voice that never feels performative',
    'The ending image is perfect — specific, warm, and thematically resonant',
  ],
  improvements: [
    'Could briefly gesture toward what she wants to study in college',
    'The AP class pivot is slightly conventional — but executed well enough to transcend',
  ],
  tags: ['identity', 'first-gen', 'bilingual', 'community', 'food-access', 'family', 'entrepreneurship', 'advocacy'],
  tier: 'exceptional',
};

const ESSAY_WHY_US_1: SampleEssay = {
  id: 'sample-whyus-1',
  title: 'The Basement Lab',
  promptType: 'why_us',
  prompt: 'How will you explore your intellectual and academic interests at the University of Pennsylvania?',
  schoolContext: 'University of Pennsylvania',
  wordCount: 198,
  essay: `Last summer, I emailed Professor Bhatt in Penn's GRASP Lab a question about her paper on robotic grasping under uncertainty. I expected silence. Instead, she sent back three paragraphs and a follow-up question that kept me thinking for a week.

That exchange crystallized what I'd been sensing about Penn Engineering: it's a place where a seventeen-year-old's curiosity is taken seriously. The GRASP Lab's approach to embodied intelligence — treating manipulation not as a solved kinematics problem but as a perception challenge — aligns with the research direction I've been pursuing on my own, using a $40 Arduino setup in my parents' basement to test compliant grasp strategies.

I want to take MEAM 520 and actually understand the math behind what I've been hacking together intuitively. I want to bring my food-robotics side project — an automated sorting system for my uncle's produce warehouse — into Penn's Weiss Tech House and find collaborators who think "that's weird" is a compliment.

But honestly, what sealed it was Professor Bhatt's sign-off: "If you build anything interesting, send me a video." That's the culture I want to learn in — where building things matters as much as theorizing about them.`,
  scoring: {
    authenticity: 10,
    storytelling: 8,
    selfReflection: 8,
    specificity: 10,
    promptAlignment: 10,
    writing: 9,
    overall: 10,
  },
  aoCommentary: 'This is a masterclass in the "Why Us" essay. Every sentence demonstrates genuine research and personal connection. The student doesn\'t just name-drop — they explain WHY specific resources matter to THEIR trajectory. The $40 Arduino detail and the uncle\'s produce warehouse make the academic interest feel lived-in, not manufactured. The professor email anecdote is the kind of thing you can\'t fake.',
  strengths: [
    'Every Penn reference connects to a personal project or interest',
    'Demonstrates initiative (emailing a professor) without bragging',
    'Specific course number and lab name show genuine research',
    'The "parents\' basement" and "uncle\'s warehouse" details ground it in reality',
    'Natural, conversational closing that reveals school culture understanding',
  ],
  improvements: [
    'Could mention one humanities or interdisciplinary interest to show breadth',
  ],
  tags: ['why-us', 'engineering', 'research', 'robotics', 'specificity', 'initiative'],
  tier: 'exceptional',
};

/* ─── STRONG TIER (7-8 overall) ─── */

const ESSAY_COMMUNITY_1: SampleEssay = {
  id: 'sample-comm-1',
  title: 'Table Nine',
  promptType: 'community',
  prompt: 'Tell us about your engagement with a community to which you belong. How do you feel you have contributed to this community?',
  schoolContext: 'Yale University',
  wordCount: 247,
  essay: `There are eleven tables in the Greenfield Senior Center dining hall. Table Nine is mine — or rather, it belongs to Bev, Margaret, Don, and Carl, and they let me sit there every Tuesday.

I started volunteering at Greenfield sophomore year because I needed service hours. I'll be honest about that. But something happened at Table Nine that I didn't expect: I got drafted into a book club.

Bev had just finished "Demon Copperhead" and was furious — not at the book, but at the opioid crisis it described. "We lived through this," she said, gesturing at the room. "Half the people here lost grandkids." That conversation lasted two hours. I missed my ride home and didn't care.

Now we read a book a month. I pick one, they pick one. They chose "All Quiet on the Western Front" (Don is a Vietnam vet and wanted to "compare notes"). I chose "The Hate U Give" and spent an entire Tuesday getting questioned by four people in their eighties about what it's like to be young and Black in a suburb that thinks it isn't racist.

What I've contributed isn't service in the way applications want you to frame it. I haven't organized a fundraiser or launched a program. What I've done is show up, every Tuesday, and participate in a conversation that crosses seventy years of lived experience. I've brought my world to their table, and they've handed me theirs.

Table Nine taught me that community isn't something you build on a résumé. It's something you build at lunch.`,
  scoring: {
    authenticity: 9,
    storytelling: 9,
    selfReflection: 8,
    specificity: 9,
    promptAlignment: 9,
    writing: 9,
    overall: 9,
  },
  aoCommentary: 'Refreshingly honest opening about the service hours motivation — that kind of candor builds trust immediately. The essay does what the best community essays do: it shows reciprocity rather than saviorism. The student is learning as much as giving. Book titles are perfect concrete details, and the last line is a genuine closer that earns its sentiment.',
  strengths: [
    'Honest about initial motivation — builds reader trust',
    'Named characters make the community tangible',
    'Specific book titles serve as anchors for deeper themes',
    'Avoids the "I helped the less fortunate" trap',
    'Last line is earned and memorable',
  ],
  improvements: [
    'Could show one specific moment of personal growth from the conversations',
    'The race reference in paragraph 4 could be developed more — it feels slightly rushed',
  ],
  tags: ['community', 'service', 'intergenerational', 'books', 'honesty', 'reciprocity'],
  tier: 'exceptional',
};

const ESSAY_INTELLECTUAL_1: SampleEssay = {
  id: 'sample-intel-1',
  title: 'The Comma Argument',
  promptType: 'intellectual',
  prompt: 'Think about an idea or topic that has been intellectually exciting for you. Why are you drawn to it?',
  schoolContext: 'Yale University',
  wordCount: 243,
  essay: `In seventh grade, my English teacher told me I used too many commas. In ninth grade, my history teacher told me I didn't use enough. This contradiction sent me down a rabbit hole I haven't climbed out of: the politics of punctuation.

It sounds absurd, but commas are genuinely ideological. The Oxford comma debate isn't about grammar — it's about whether clarity or efficiency should govern communication. Legal cases have hinged on comma placement. The 2014 O'Connor v. Oakhurst Dairy case — $5 million in overtime pay — turned on a missing Oxford comma in Maine labor law.

That case became my gateway into linguistics, which became my gateway into how language shapes power. I read Lakoff's "Metaphors We Live By" and suddenly couldn't stop noticing how the metaphors we use for immigration ("flood," "wave," "surge") frame human beings as natural disasters. I brought this to my debate team, and we restructured our entire case on education policy around the language of the resolution itself.

What excites me isn't grammar rules. It's the realization that the smallest units of language — a comma, a metaphor, a pronoun — carry enormous weight. They shape courtrooms, classrooms, and elections. They decide who is heard and how.

I want to study linguistics not because I love diagramming sentences (though I do, unapologetically). I want to study it because I believe the most powerful systems are the ones we stop noticing. Language is the ultimate invisible architecture.`,
  scoring: {
    authenticity: 9,
    storytelling: 8,
    selfReflection: 9,
    specificity: 9,
    promptAlignment: 10,
    writing: 9,
    overall: 9,
  },
  aoCommentary: 'Brilliant hook — the comma contradiction is unexpected and instantly engaging. This essay demonstrates genuine intellectual curiosity by showing an escalation: grammar → legal cases → linguistics → power structures. The O\'Connor v. Oakhurst Dairy reference proves this student actually did the reading. The "invisible architecture" metaphor in the closing is sophisticated without being pretentious.',
  strengths: [
    'Unusual topic that stands out from typical "intellectual curiosity" essays',
    'Clear intellectual escalation from small observation to big ideas',
    'Real-world case study demonstrates depth of interest',
    'Connects academic interest to practical applications (debate team)',
    'The parenthetical about diagramming sentences adds personality',
  ],
  improvements: [
    'Could include a moment of being wrong or having assumptions challenged',
    'The debate team mention feels slightly name-droppy — could be cut',
  ],
  tags: ['intellectual', 'linguistics', 'law', 'language', 'power', 'academic-passion'],
  tier: 'exceptional',
};

const ESSAY_CHALLENGE_1: SampleEssay = {
  id: 'sample-chall-1',
  title: 'Thirty-Seven Seconds',
  promptType: 'challenge',
  prompt: 'Tell us about a significant challenge you\'ve faced or something important that didn\'t go according to plan. How did you manage the situation?',
  schoolContext: 'MIT',
  wordCount: 249,
  essay: `Thirty-seven seconds. That's how long my robot lasted in the FIRST Robotics regional semifinal before the drive shaft snapped and 200 hours of work became an expensive paperweight on the arena floor.

I'd designed that shaft. I'd done the stress calculations, chosen the aluminum alloy, and told my team it would hold. I was wrong — not because the math was bad, but because I'd tested for static loads when competition involves dynamic impacts. I'd solved the wrong problem elegantly.

The next four hours were the most productive of my life. While half the team processed the loss, I pulled the broken shaft, measured the failure point, and realized the fracture pattern told a story: fatigue cracking from a stress riser I'd introduced at a keyway cut. A textbook failure mode I should have caught.

We didn't advance. But in our hotel room that night, I redesigned the shaft with a fillet radius at the keyway and switched to 7075-T6 aluminum. I 3D-printed a scale model at the hotel business center's printer (the front desk person was confused but supportive). By Monday, I'd sent updated drawings to our machine shop.

That shaft is still in our robot two seasons later.

What I learned wasn't "failure is a teacher" — that's a poster in a guidance counselor's office. What I learned is that failure has data. The fracture surface told me more than my simulation ever did. Now when something breaks, my first instinct isn't frustration. It's to look at the break.`,
  scoring: {
    authenticity: 9,
    storytelling: 9,
    selfReflection: 9,
    specificity: 10,
    promptAlignment: 9,
    writing: 8,
    overall: 9,
  },
  aoCommentary: 'This reads like a future engineer who already thinks like one. The technical specificity is remarkable — "7075-T6 aluminum," "fillet radius at the keyway" — but it never becomes inaccessible. The key insight about solving "the wrong problem elegantly" is sophisticated self-awareness. The hotel business center detail is the kind of thing that proves this really happened. And the rejection of the platitude at the end shows intellectual maturity.',
  strengths: [
    'Technical detail that demonstrates real expertise without alienating readers',
    'Honest about personal responsibility for the failure',
    'The "hotel business center" detail is charmingly specific',
    'Rejects cliché in the conclusion — shows awareness of genre conventions',
    'The shaft still being in the robot proves the lesson stuck',
  ],
  improvements: [
    'Could acknowledge the team dynamics more — how did teammates react to his initial design failure?',
    'The pacing in paragraph 3 could breathe a bit more',
  ],
  tags: ['challenge', 'engineering', 'robotics', 'failure', 'technical', 'problem-solving', 'FIRST'],
  tier: 'exceptional',
};

const ESSAY_ACTIVITY_1: SampleEssay = {
  id: 'sample-act-1',
  title: 'Kitchen Translator',
  promptType: 'activity',
  prompt: 'Tell us about something you do simply for the fun of it.',
  schoolContext: 'MIT',
  wordCount: 193,
  essay: `I reverse-engineer restaurant dishes. Not professionally — just for fun, standing in my kitchen at 11 PM with a phone full of blurry food photos and a pantry that's missing half the ingredients.

It started when my family went to a Sichuan restaurant and my little brother wouldn't stop talking about the dan dan noodles. We couldn't afford to go back every week, so I decided to figure it out. Three versions later (the first was inedibly spicy, the second was basically peanut soup), I landed on something close. My brother said it was "like, 80% as good." High praise from a twelve-year-old.

Now I do it constantly. Thai basil chicken from that place on Route 9. The impossible-to-replicate garlic sauce from Nona's Pizza. Each dish is a puzzle: reverse-engineer the flavor profile, research the technique, iterate. My Notes app has 47 entries labeled things like "that brown sauce??" and "cumin but also not cumin."

I don't think of this as cooking. I think of it as edible debugging. Something's off in the output, so you trace it back through the process until you find the variable you got wrong. Then you eat your mistakes, which is better than most debugging.`,
  scoring: {
    authenticity: 10,
    storytelling: 8,
    selfReflection: 7,
    specificity: 10,
    promptAlignment: 10,
    writing: 9,
    overall: 9,
  },
  aoCommentary: 'This is joyful and unpretentious — exactly what this prompt asks for. The "edible debugging" framing is clever without being forced, and it reveals an engineering mindset through something deeply personal. The Notes app detail ("cumin but also not cumin") is laugh-out-loud specific. The brother\'s "80% as good" shows this student doesn\'t inflate achievements.',
  strengths: [
    'Genuinely fun to read — matches the prompt\'s spirit perfectly',
    'The "edible debugging" metaphor connects hobby to academic identity naturally',
    'Specific, funny details that can\'t be fabricated',
    'Shows family connection without sentimentality',
    'Reveals problem-solving mindset through a non-academic lens',
  ],
  improvements: [
    'Could push the reflection slightly deeper — what does this hobby reveal about how they learn?',
  ],
  tags: ['activity', 'cooking', 'problem-solving', 'family', 'humor', 'creativity'],
  tier: 'exceptional',
};

const ESSAY_ROOMMATE_1: SampleEssay = {
  id: 'sample-room-1',
  title: 'A Few Things',
  promptType: 'roommate',
  prompt: 'Virtually all of Stanford\'s undergraduates live on campus. Write a note to your future roommate that reveals something about you or that will help your roommate — and us — get to know you better.',
  schoolContext: 'Stanford University',
  wordCount: 246,
  essay: `Hey,

A few things you should probably know before we figure out the mini-fridge situation:

I talk in my sleep. Apparently it's mostly gibberish, but my sister says I once gave a very passionate argument about whether a hot dog is a sandwich (my unconscious position: it is). If I start debating food taxonomy at 3 AM, just throw a pillow at me. I won't remember.

I will absolutely make you try my cooking experiments. I'm not saying they'll be good — my attempt at homemade miso resulted in something my dad described as "aggressively beige" — but I will be enthusiastic about them. Fair warning: I consider the smoke detector going off to be a sign of ambition, not failure.

I keep a running list on my phone called "Things I Don't Understand Yet." Current entries include: why ice is slippery (it's actually not settled science — look it up), how scoring works in cricket, and what my grandmother means when she says someone has "an old soul." I will want to discuss these with you at inconvenient times.

I can't sleep without a fan running. Not for the air — for the noise. My brain is loud and needs competition.

I'll probably rearrange my desk three times in the first week. I'm not indecisive; I just think spatial optimization is an ongoing process.

I'm terrible at small talk but good at the conversation that comes after it. So maybe we skip the "where are you from" part and go straight to "what's the last thing that made you change your mind?"

Looking forward to it.`,
  scoring: {
    authenticity: 10,
    storytelling: 7,
    selfReflection: 8,
    specificity: 10,
    promptAlignment: 10,
    writing: 9,
    overall: 9,
  },
  aoCommentary: 'This is how you write a roommate letter. Every detail reveals character without trying to: the hot dog debate shows playfulness, the "Things I Don\'t Understand Yet" list shows intellectual curiosity, the fan detail shows self-awareness, the desk rearranging shows how they think. The closing pivot from small talk to real conversation is the perfect ending — it tells the admissions office exactly who this person is in a room.',
  strengths: [
    'Each paragraph reveals a different dimension of personality',
    'Humor is natural and self-deprecating without being insecure',
    'The "Things I Don\'t Understand Yet" list is brilliant — shows intellectual curiosity playfully',
    'Format (letter) is perfect for the prompt',
    'The closing line is genuinely inviting and reveals social depth',
  ],
  improvements: [
    'Could include one slightly more vulnerable or serious detail to add emotional range',
  ],
  tags: ['roommate', 'humor', 'personality', 'intellectual-curiosity', 'self-awareness', 'stanford'],
  tier: 'exceptional',
};

const ESSAY_DIVERSITY_1: SampleEssay = {
  id: 'sample-div-1',
  title: 'Both Boxes',
  promptType: 'diversity',
  prompt: 'Harvard has long recognized the importance of enrolling a diverse student body. How will the life experiences that shape who you are today enable you to contribute to Harvard?',
  schoolContext: 'Harvard University',
  wordCount: 198,
  essay: `I check two boxes on forms: Black and white. But I grew up in neither box — I grew up in the space between them, which has no checkbox.

My dad's family is from Macon, Georgia. Sunday dinners, AME church, sweet tea so sugary it could qualify as dessert. My mom's family is from Portland, Maine. Book clubs, Unitarian services, sparkling water with everything. I love both tables. Neither feels like pretending.

But other people's confusion became my problem. "You don't look Black," from a kid at church. "You must be adopted," from a neighbor in Maine. I spent years trying to resolve an equation that doesn't balance — how to be enough of two things simultaneously.

I stopped trying to balance it. In AP US History, I wrote my research paper on the one-drop rule and how racial categories in America were designed to be boxes, not spectrums. That paper became the first honest thing I'd ever written about myself.

What I'd bring to Harvard isn't a resolved identity. It's a practiced comfort with complexity. I know what it's like to sit in a room where your presence raises a question, and I've learned that the question is usually more interesting than any answer would be.`,
  scoring: {
    authenticity: 9,
    storytelling: 8,
    selfReflection: 10,
    specificity: 9,
    promptAlignment: 9,
    writing: 9,
    overall: 9,
  },
  aoCommentary: 'This handles a fraught topic with remarkable grace. The parallel descriptions of each family — sweet tea vs. sparkling water — are vivid without being reductive. The one-drop rule paper is the pivot point that transforms personal confusion into intellectual inquiry. The final framing — "practiced comfort with complexity" — is exactly the kind of disposition Harvard values. This student won\'t just tolerate diversity; they\'ll deepen conversations about it.',
  strengths: [
    'Handles biracial identity with nuance — avoids both the "tragic mulatto" and "best of both worlds" tropes',
    'Parallel family descriptions are vivid and specific',
    'Academic connection (one-drop rule paper) feels genuine',
    'The "practiced comfort with complexity" framing is sophisticated',
    'Answers "what will you contribute" without listing activities',
  ],
  improvements: [
    'At 198 words, it\'s tight — a few more lines exploring the Harvard-specific contribution could strengthen it',
  ],
  tags: ['diversity', 'biracial', 'identity', 'race', 'self-reflection', 'history', 'complexity'],
  tier: 'exceptional',
};

const ESSAY_CREATIVE_1: SampleEssay = {
  id: 'sample-creative-1',
  title: 'The Playlist',
  promptType: 'creative',
  prompt: 'If you could create a playlist to describe your life, what five songs would be on it and why?',
  schoolContext: 'University of Chicago',
  wordCount: 245,
  essay: `Track 1: "Clair de Lune" — Debussy
Not because I'm sophisticated. Because when I was four, our apartment had a leak in the ceiling that dripped into a pot on the kitchen floor, and my mom played this piece on her phone and told me the dripping was keeping time. That's the first lie I believed on purpose.

Track 2: "DNA." — Kendrick Lamar
My cousin played this on a road trip to our grandmother's funeral. I was twelve and didn't understand half the lyrics. But the energy — the ferocity of someone insisting on their own complexity — that I understood completely.

Track 3: "Vienna" — Billy Joel
My high school counselor played this when I had a panic attack over a B+ in AP Chem. "Slow down, you crazy child." I resented the advice at the time. I've listened to the song 340 times since. (Yes, Spotify tracks this. Yes, it's embarrassing.)

Track 4: "Redbone" — Childish Gambino
This is the song playing in the background of the only photo I have of all four of my grandparents in the same room. Thanksgiving 2019. Two of them are gone now. The bassline sounds like that evening felt.

Track 5: "Unwritten" — Natasha Bedingfield
I know. But my little sister sings this every single morning while making cereal. It's objectively annoying and subjectively the best sound in my life. Some songs matter not because of what they are but because of who sings them.

No shuffle. Play in order. That's the arc.`,
  scoring: {
    authenticity: 10,
    storytelling: 9,
    selfReflection: 8,
    specificity: 10,
    promptAlignment: 10,
    writing: 10,
    overall: 10,
  },
  aoCommentary: 'UChicago essays reward creative risk and this delivers. Each song choice is unexpected — the real magic is in the WHY. The ceiling leak / Debussy connection is genuinely beautiful. The Spotify play count admission is self-aware and funny. The Childish Gambino paragraph packs an enormous emotional punch in four sentences. The Natasha Bedingfield closer is perfectly disarming. The final line — "No shuffle. Play in order. That\'s the arc." — is so good it hurts.',
  strengths: [
    'Every song connects to a specific, irreplaceable memory',
    'Tonal range: funny, tender, grieving, defiant — all in 245 words',
    'Self-aware humor (the Spotify count, "I know" before Natasha Bedingfield)',
    'The closing line is a mic-drop ending',
    'Each entry reveals something different about the student',
  ],
  improvements: [
    'This is essentially flawless for what it is. Minor note: could hint at academic identity more.',
  ],
  tags: ['creative', 'music', 'family', 'grief', 'humor', 'uchicago', 'vulnerability'],
  tier: 'exceptional',
};

const ESSAY_FUTURE_1: SampleEssay = {
  id: 'sample-future-1',
  title: 'The Waiting Room',
  promptType: 'future',
  prompt: 'Briefly describe how you hope to use your college education.',
  schoolContext: 'Harvard University',
  wordCount: 196,
  essay: `My mom has been on a waitlist for a therapist for eleven months. She signed up after my parents' divorce, when she was sleeping four hours a night and crying in the car before work. Eleven months. In a suburb with good schools and a Whole Foods. The waitlist in our rural hometown, where my grandmother lives? Twenty-two months.

I used to think the mental health crisis was about stigma. It is, partly. But the bigger problem is math: there aren't enough clinicians, and the ones who exist don't practice where they're needed. The American Psychological Association estimates a shortage of over 10,000 providers in rural areas alone.

I want to study psychology and public health — not to become a therapist (though I might), but to redesign the systems that decide who gets care and when. Teletherapy platforms, training pipeline reform, insurance reimbursement models that don't penalize providers for treating Medicaid patients.

None of this sounds romantic. It's not "I want to change the world" — it's "I want to fix the scheduling infrastructure of the world." But my mom's eleven months on a waitlist taught me that access isn't a policy abstraction. It's a person, not sleeping, waiting for a phone call.`,
  scoring: {
    authenticity: 9,
    storytelling: 8,
    selfReflection: 8,
    specificity: 9,
    promptAlignment: 10,
    writing: 9,
    overall: 9,
  },
  aoCommentary: 'This transforms a "what do you want to study" essay into something visceral. The opening stat (eleven months) is devastating, and the comparison to the rural waitlist compounds it. The student shows policy literacy without sounding like they\'re reciting a white paper. The self-aware "none of this sounds romantic" line proves they know this isn\'t a typical passion story — and that\'s exactly why it works.',
  strengths: [
    'Opens with personal urgency that grounds the policy interest',
    'Specific data (APA shortage, 10,000 providers) shows real research',
    'Clearly articulated career direction with multiple pathways',
    'Self-aware about the un-glamorous nature of systems work',
    'Closing callback to the mother\'s waitlist is emotionally powerful',
  ],
  improvements: [
    'Could mention one Harvard-specific resource — but this is a general "how will you use education" prompt, so it\'s fine as-is',
  ],
  tags: ['future', 'mental-health', 'public-health', 'psychology', 'access', 'policy', 'family'],
  tier: 'exceptional',
};

/* ─── STRONG TIER (7-8 overall) ─── */

const ESSAY_WHYUS_2: SampleEssay = {
  id: 'sample-whyus-2',
  title: 'More Than the Name',
  promptType: 'why_us',
  prompt: 'What is it about Yale that has led you to apply?',
  schoolContext: 'Yale University',
  wordCount: 124,
  essay: `When I visited Yale last April, I sat in on a directed studies lecture about Thucydides. The professor asked a question about power and morality, and a physics major raised her hand. Her answer connected game theory to Athenian diplomacy, and the professor didn't just allow it — he built the next twenty minutes of class around it.

That moment is why I'm applying. Not the name, not the residential colleges, not the Gothic architecture (though I did stare at Harkness Tower for too long). I want a place where a physics major feels entitled to have an opinion about Thucydides, and where that opinion makes the room smarter.

Yale feels like that place.`,
  scoring: {
    authenticity: 8,
    storytelling: 8,
    selfReflection: 7,
    specificity: 9,
    promptAlignment: 9,
    writing: 8,
    overall: 8,
  },
  aoCommentary: 'Strong "Why Yale" in just 124 words. The campus visit anecdote does all the heavy lifting — it shows the student experienced the culture rather than just reading about it. The parenthetical about Harkness Tower adds warmth. The key insight about interdisciplinary conversation is exactly what Yale\'s directed studies program values.',
  strengths: [
    'Anecdote from an actual visit feels authentic and specific',
    'The physics-major-on-Thucydides detail captures Yale\'s interdisciplinary culture perfectly',
    'Short, confident, doesn\'t overstay its welcome at 124 words',
    'Shows what the student values in education',
  ],
  improvements: [
    'Could connect more explicitly to the student\'s own academic interests',
    'Doesn\'t mention specific programs or professors they want to work with',
    'Light on the "I" — we learn what impressed them but less about who they are',
  ],
  tags: ['why-us', 'yale', 'interdisciplinary', 'campus-visit', 'liberal-arts'],
  tier: 'strong',
};

const ESSAY_IDENTITY_2: SampleEssay = {
  id: 'sample-ident-2',
  title: 'The Accent',
  promptType: 'identity',
  prompt: 'Tell us about something that is meaningful to you, and why?',
  schoolContext: 'Stanford University',
  wordCount: 248,
  essay: `I have two accents. There's the one I use at school — the one I practiced in my bedroom mirror in sixth grade until it sounded like the newscasters on NBC. Clear. Neutral. "Correct."

And there's the one that comes out when I'm home in Baton Rouge with my grandparents — the one where "water" has a soft 'a' and sentences end on a rising note like they're always about to become questions. The one my AP English teacher once called "charming," which is a word people use for accents they don't take seriously.

For a long time, I toggled between them like switching apps. School voice. Home voice. I didn't think of it as code-switching — I thought of it as growing up. Everyone adjusts how they talk, right?

But junior year, I took a sociolinguistics course online (MIT OpenCourseWare — free and life-changing), and I learned that accent bias is measurable. Studies show Southern accents are rated lower on intelligence scales, even when the content is identical. The "neutral" American accent isn't neutral at all — it's a Midwestern standard that we've collectively agreed sounds like authority.

That made me angry. Then it made me curious. I started recording my grandparents' speech patterns — not to study them like specimens, but to document what I think is being lost. Fourteen hours of audio so far. My grandmother telling the story of how she met my grandfather is the best thing I've ever recorded.

That accent is meaningful to me because it's proof that my family sounds like somewhere.`,
  scoring: {
    authenticity: 9,
    storytelling: 8,
    selfReflection: 9,
    specificity: 8,
    promptAlignment: 9,
    writing: 9,
    overall: 8,
  },
  aoCommentary: 'This takes a common experience — code-switching — and deepens it with genuine intellectual inquiry. The MIT OCW reference feels organic, not name-droppy. The shift from anger to curiosity to documentation shows a mature response to injustice. The recording project is specific and meaningful. The last line is strong — "my family sounds like somewhere" is a beautiful way to articulate cultural belonging.',
  strengths: [
    'Takes a relatable experience and finds intellectual depth',
    'The "charming" observation is perceptive and subtly critical',
    'Academic research supports personal experience without overwhelming it',
    'The recording project demonstrates initiative and emotional intelligence',
    'Beautiful closing line',
  ],
  improvements: [
    'The code-switching topic is fairly common — the execution elevates it but the subject isn\'t unique',
    'Could include a specific excerpt from the grandparents\' recordings',
  ],
  tags: ['identity', 'accent', 'code-switching', 'sociolinguistics', 'family', 'southern', 'documentation'],
  tier: 'strong',
};

const ESSAY_CHALLENGE_2: SampleEssay = {
  id: 'sample-chall-2',
  title: 'The Reading List',
  promptType: 'challenge',
  prompt: 'Reflect on a time you discussed an issue important to you with someone holding an opposing view. How did the experience affect your own thinking?',
  schoolContext: 'Yale University',
  wordCount: 248,
  essay: `My uncle and I disagree about everything. Immigration, healthcare, whether LeBron is the GOAT (he's wrong on all three, for the record). Thanksgiving at our house is less a meal than a moderated debate with stuffing.

But last Thanksgiving was different. We were arguing about affirmative action — I was for it, passionately and loudly — when he said something that actually stopped me: "You're arguing the principle. I'm arguing the implementation. We might agree more than you think."

He was right. I'd been so focused on defending the moral case that I hadn't engaged with his specific concern, which was about transparency in how admissions criteria are weighed. When I actually listened, his position was more nuanced than the caricature I'd built: he supported diversity goals but wanted clearer standards. I still disagreed with his conclusions, but I couldn't pretend his premises were unreasonable.

That conversation sent me down a two-month reading spiral. I read the Students for Fair Admissions v. Harvard briefs — both sides. I read Randall Kennedy and Thomas Sowell, back to back, which is intellectually disorienting in the best way. I came out of it with a more complicated position and a better-defended one.

My uncle didn't change my mind. But he changed how I hold my mind. I'm less interested now in winning an argument than in understanding why the other side believes they're right. That's not centrism — it's due diligence. And it makes my own arguments sharper, which is the part I didn't expect.`,
  scoring: {
    authenticity: 8,
    storytelling: 7,
    selfReflection: 10,
    specificity: 8,
    promptAlignment: 10,
    writing: 8,
    overall: 8,
  },
  aoCommentary: 'This is one of the hardest prompts to do well because students either fake a mind-change or refuse to engage with the other side. This student threads the needle: they took the opposing view seriously without abandoning their own. The "arguing principle vs. implementation" insight is genuinely sharp. Reading both sides of the SFFA case shows initiative. The distinction between changing their mind and changing how they hold their mind is the essay\'s strongest line.',
  strengths: [
    'Engages honestly with a real disagreement — doesn\'t sanitize',
    'The "principle vs. implementation" distinction is genuinely insightful',
    'Cites specific readings that demonstrate follow-through',
    'Distinguishes intellectual humility from abandoning convictions',
    'The LeBron joke adds warmth without undermining seriousness',
  ],
  improvements: [
    'Could show more emotional vulnerability — the tone is very cerebral',
    'The "not centrism — it\'s due diligence" line is good but slightly rehearsed',
  ],
  tags: ['challenge', 'disagreement', 'affirmative-action', 'intellectual-humility', 'family', 'nuance'],
  tier: 'strong',
};

/* ─── GOOD TIER (5-6 overall) — for calibration ─── */

const ESSAY_WHYUS_WEAK: SampleEssay = {
  id: 'sample-whyus-weak',
  title: 'Dream School',
  promptType: 'why_us',
  prompt: 'What is it about Yale that has led you to apply?',
  schoolContext: 'Yale University',
  wordCount: 121,
  essay: `Yale has been my dream school since I was a kid. The beautiful campus, world-class professors, and incredible alumni network make it the perfect place for me to pursue my passion for political science.

I'm excited about the residential college system, which will allow me to form close bonds with my peers. I also look forward to taking advantage of Yale's study abroad programs and internship opportunities in Washington, D.C.

With its long history of producing leaders in government, law, and public service, Yale is where I know I can make the most of my potential and contribute to the vibrant intellectual community. I can't wait to call myself a Bulldog.`,
  scoring: {
    authenticity: 4,
    storytelling: 3,
    selfReflection: 3,
    specificity: 3,
    promptAlignment: 5,
    writing: 5,
    overall: 4,
  },
  aoCommentary: 'This could be written about almost any top university by replacing "Yale" and "Bulldog" with another school\'s name. There\'s nothing here that reveals who this specific student is or why Yale specifically matters to them. "Dream school since I was a kid" is one of the most common openings we see, and "beautiful campus, world-class professors, incredible alumni network" are generic descriptors that apply to a dozen schools. Where is the student in this essay?',
  strengths: [
    'Grammatically clean and well-structured',
    'Mentions specific Yale features (residential colleges, study abroad)',
  ],
  improvements: [
    'Replace generic praise with specific personal connections to Yale resources',
    'Show don\'t tell — instead of saying "passion for political science," describe a specific moment or project',
    'The opening "dream school since I was a kid" is a red flag for admissions readers',
    'Nothing distinguishes this student from thousands of other applicants',
    'Add a specific class, professor, program, or experience that only Yale offers',
    'The "vibrant intellectual community" phrase is meaningless without evidence',
  ],
  tags: ['why-us', 'generic', 'weak-example', 'calibration', 'common-mistakes'],
  tier: 'needs_work',
};

const ESSAY_PS_WEAK: SampleEssay = {
  id: 'sample-ps-weak',
  title: 'My Passion for Helping Others',
  promptType: 'community',
  prompt: 'Tell us about your engagement with a community to which you belong. How do you feel you have contributed to this community?',
  wordCount: 219,
  essay: `Ever since I was young, I've always had a passion for helping others. When I see someone in need, I feel compelled to make a difference. This desire to help has defined my high school experience and shaped who I am today.

During my sophomore year, I joined our school's community service club. Over the past three years, I've volunteered at the local food bank every month, organizing donations and distributing meals to families in need. This experience taught me the importance of giving back and showed me how much of an impact one person can have.

I also organized a canned food drive during the holidays that collected over 500 items for local families. Seeing the grateful faces of the people we helped reminded me why service matters. It was truly a humbling and rewarding experience.

Beyond the food bank, I've tutored underclassmen in math and science, helping them improve their grades and build confidence. There's nothing more fulfilling than watching a student's face light up when they finally understand a concept.

These experiences have taught me that true leadership isn't about titles or positions — it's about showing up and making a difference. I plan to continue my commitment to service in college and beyond, because I believe that helping others is the most important thing we can do.`,
  scoring: {
    authenticity: 4,
    storytelling: 3,
    selfReflection: 3,
    specificity: 4,
    promptAlignment: 5,
    writing: 5,
    overall: 4,
  },
  aoCommentary: 'This essay has all the telltale signs of surface-level writing: vague opening about "always having a passion," a list of activities without depth, cliché phrases like "humbling and rewarding experience" and "face light up." The 500 cans stat is good but it\'s presented as a resume bullet point rather than a story. There\'s no specific scene, no named person, no moment of genuine surprise or growth. We read hundreds of essays that sound exactly like this.',
  strengths: [
    'Shows genuine involvement in community service',
    'Includes a specific metric (500 items)',
    'Well-organized structure',
  ],
  improvements: [
    'Open with a specific scene at the food bank — what happened on one particular day?',
    'Name someone you interacted with and describe a real conversation',
    'Replace "passion for helping others" with a concrete anecdote that SHOWS the passion',
    '"Humbling and rewarding" and "face light up" are the most overused phrases in admissions essays',
    'The conclusion reads like a mission statement — show growth through story instead',
    'Ask: what surprised you? What challenged your assumptions? What was uncomfortable?',
  ],
  tags: ['community', 'generic', 'weak-example', 'calibration', 'cliche', 'common-mistakes'],
  tier: 'needs_work',
};

const ESSAY_GOOD_IDENTITY: SampleEssay = {
  id: 'sample-ident-good',
  title: 'The Greenhouse',
  promptType: 'identity',
  prompt: 'How has the world you come from shaped your dreams and aspirations?',
  schoolContext: 'MIT',
  wordCount: 247,
  essay: `My parents run a commercial greenhouse in central New Jersey. It's not a farm in the romantic sense — no red barn, no rolling fields. It's four plastic-covered hoop houses on two acres between a gas station and a dollar store. We grow tomatoes, peppers, and whatever bedding plants sell that season.

I grew up adjusting drip irrigation timers and monitoring soil pH before I knew what either of those things meant scientifically. By thirteen, I noticed that our tomato yield dropped every August, and I couldn't let it go. I set up a temperature logging system using three thermometers and a notebook (very low-tech) and tracked the correlation between heat spikes and blossom drop.

My parents thought it was sweet that I was "playing scientist." Then I showed them that shifting our planting schedule by two weeks based on the temperature data could increase August yield by roughly 15%. They shifted the schedule. It worked. That was the moment I realized science wasn't something that happened in labs — it happened in hoop houses next to dollar stores.

I want to study agricultural engineering because I've seen what small-scale growers face: thin margins, climate unpredictability, and technology designed for operations fifty times their size. The tools that could help my parents exist in research papers. I want to be the person who moves them from papers to hoop houses.

My world smells like potting soil and tastes like tomatoes that never saw a grocery store shelf. That world made me an engineer before I knew the word.`,
  scoring: {
    authenticity: 8,
    storytelling: 7,
    selfReflection: 7,
    specificity: 8,
    promptAlignment: 8,
    writing: 7,
    overall: 7,
  },
  aoCommentary: 'A solid identity essay that grounds academic interest in lived experience. The greenhouse setting is distinctive and well-drawn. The temperature logging story shows initiative and scientific thinking without being showy. The "hoop houses next to dollar stores" refrain is a nice structural touch. Could push the personal reflection deeper — we learn about the greenhouse but want to know more about how this student thinks and feels.',
  strengths: [
    'Distinctive setting that immediately separates this from other essays',
    'Concrete data point (15% yield increase) gives credibility',
    'Clear connection between personal background and academic interest',
    'The "papers to hoop houses" line is a strong articulation of purpose',
  ],
  improvements: [
    'The emotional landscape is thin — add a moment of frustration, doubt, or wonder',
    'Parents\' reaction is underdeveloped — the "playing scientist" moment could be expanded',
    'The last paragraph tells rather than shows',
    'Could benefit from one moment of failure or unexpected learning',
  ],
  tags: ['identity', 'agriculture', 'engineering', 'family-business', 'science', 'first-gen-adjacent'],
  tier: 'strong',
};

/* ─── EXPORTS ─── */

export const SAMPLE_ESSAYS: SampleEssay[] = [
  // Exceptional tier
  ESSAY_PERSONAL_STATEMENT_1,
  ESSAY_WHY_US_1,
  ESSAY_COMMUNITY_1,
  ESSAY_INTELLECTUAL_1,
  ESSAY_CHALLENGE_1,
  ESSAY_ACTIVITY_1,
  ESSAY_ROOMMATE_1,
  ESSAY_DIVERSITY_1,
  ESSAY_CREATIVE_1,
  ESSAY_FUTURE_1,
  // Strong tier
  ESSAY_WHYUS_2,
  ESSAY_IDENTITY_2,
  ESSAY_CHALLENGE_2,
  ESSAY_GOOD_IDENTITY,
  // Needs work tier (for calibration)
  ESSAY_WHYUS_WEAK,
  ESSAY_PS_WEAK,
];

/* ─── HELPER FUNCTIONS ─── */

/** Get essays by prompt type */
export function getEssaysByType(type: PromptType): SampleEssay[] {
  return SAMPLE_ESSAYS.filter(e => e.promptType === type);
}

/** Get essays by tier */
export function getEssaysByTier(tier: SampleEssay['tier']): SampleEssay[] {
  return SAMPLE_ESSAYS.filter(e => e.tier === tier);
}

/** Get essays for a specific school */
export function getEssaysForSchool(schoolName: string): SampleEssay[] {
  return SAMPLE_ESSAYS.filter(e =>
    e.schoolContext?.toLowerCase().includes(schoolName.toLowerCase())
  );
}

/** Calculate a benchmark score from a rubric */
export function calculateBenchmarkScore(scoring: ScoringRubric): number {
  const weights = {
    authenticity: 0.20,
    storytelling: 0.15,
    selfReflection: 0.15,
    specificity: 0.15,
    promptAlignment: 0.10,
    writing: 0.15,
    overall: 0.10,
  };

  return Math.round(
    scoring.authenticity * weights.authenticity +
    scoring.storytelling * weights.storytelling +
    scoring.selfReflection * weights.selfReflection +
    scoring.specificity * weights.specificity +
    scoring.promptAlignment * weights.promptAlignment +
    scoring.writing * weights.writing +
    scoring.overall * weights.overall
  ) * 10; // Scale to 100
}

/** Get scoring thresholds based on sample essay benchmarks */
export function getScoringGuidance(userScore: number): {
  tier: string;
  message: string;
  color: string;
} {
  if (userScore >= 85) return { tier: 'Exceptional', message: 'Your essay is on par with the strongest supplementals we\'ve seen. Focus on polishing — the substance is there.', color: 'text-emerald-600' };
  if (userScore >= 70) return { tier: 'Strong', message: 'A compelling essay with clear strengths. Review the specific feedback to elevate it from strong to outstanding.', color: 'text-blue-600' };
  if (userScore >= 55) return { tier: 'Good Foundation', message: 'The bones are there but it needs more specificity and personal voice. Look at the "exceptional" samples for inspiration.', color: 'text-amber-600' };
  if (userScore >= 40) return { tier: 'Needs Development', message: 'This reads more like a first draft. Focus on adding concrete scenes, specific details, and genuine self-reflection.', color: 'text-orange-600' };
  return { tier: 'Early Draft', message: 'Start by identifying one specific story or moment, then build outward from there. Avoid general statements about passions and values.', color: 'text-red-600' };
}

/** Get all unique tags across sample essays */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  SAMPLE_ESSAYS.forEach(e => e.tags.forEach(t => tags.add(t)));
  return Array.from(tags).sort();
}

/** Find sample essays similar to a given essay based on tags and type */
export function findSimilarSamples(promptType: PromptType, tags: string[]): SampleEssay[] {
  return SAMPLE_ESSAYS
    .map(sample => {
      let score = 0;
      if (sample.promptType === promptType) score += 3;
      tags.forEach(tag => {
        if (sample.tags.includes(tag.toLowerCase())) score += 1;
      });
      return { sample, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.sample);
}
