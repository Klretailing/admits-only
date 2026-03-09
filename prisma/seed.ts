import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with demo data...');

  // ─── User accounts ───
  const accounts = [
    { name: 'Admin', email: 'admin@admitsonly.com', password: 'Admin@2024', role: 'admin', plan: null },
    { name: 'Maya Johnson', email: 'maya@beta.admitsonly.com', password: 'Beta@2026', role: 'student', plan: 'scholarship' },
    { name: 'Aisha Patel', email: 'aisha@beta.admitsonly.com', password: 'Beta@2026', role: 'student', plan: 'stem' },
    { name: 'James Williams', email: 'james@beta.admitsonly.com', password: 'Beta@2026', role: 'student', plan: 'foundations' },
    { name: 'Robert Chen', email: 'robert@beta.admitsonly.com', password: 'Beta@2026', role: 'parent', plan: null },
  ];

  const userIds: Record<string, string> = {};

  for (const acct of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: acct.email } });

    if (existing) {
      await prisma.essay.deleteMany({ where: { userId: existing.id } });
      await prisma.studentProfile.deleteMany({ where: { userId: existing.id } });
      await prisma.podMessage.deleteMany({ where: { userId: existing.id } });
      await prisma.podMember.deleteMany({ where: { userId: existing.id } });
      await prisma.user.update({
        where: { email: acct.email },
        data: {
          name: acct.name,
          password: await hash(acct.password, 12),
          role: acct.role,
          plan: acct.plan,
          lastLoginAt: acct.role !== 'admin' ? new Date(Date.now() - Math.random() * 7 * 86400000) : null,
        },
      });
      userIds[acct.email] = existing.id;
      console.log(`  Reset ${acct.email}`);
    } else {
      const user = await prisma.user.create({
        data: {
          name: acct.name,
          email: acct.email,
          password: await hash(acct.password, 12),
          role: acct.role,
          plan: acct.plan,
          lastLoginAt: acct.role !== 'admin' ? new Date(Date.now() - Math.random() * 7 * 86400000) : null,
        },
      });
      userIds[acct.email] = user.id;
      console.log(`  Created ${acct.role}: ${acct.email}`);
    }
  }

  // ─── Student profiles ───
  const profiles = [
    {
      email: 'maya@beta.admitsonly.com',
      gpa: 3.92, gpaScale: '4.0', satMath: 760, satRW: 720,
      extracurriculars: [
        { id: 'ec1', name: 'Debate Team', role: 'Captain', description: 'Led team to state finals; organized 3 community tournaments', years: 4, hoursPerWeek: 10, category: 'Clubs & Organizations' },
        { id: 'ec2', name: 'Habitat for Humanity', role: 'Volunteer Coordinator', description: 'Organized 12 weekend builds serving 8 families', years: 3, hoursPerWeek: 6, category: 'Community Service' },
        { id: 'ec3', name: 'School Newspaper', role: 'Editor-in-Chief', description: 'Published biweekly paper; mentored 15 junior writers', years: 3, hoursPerWeek: 8, category: 'Clubs & Organizations' },
      ],
    },
    {
      email: 'aisha@beta.admitsonly.com',
      gpa: 3.85, gpaScale: '4.0', satMath: 790, satRW: 680,
      extracurriculars: [
        { id: 'ec4', name: 'Robotics Club', role: 'President', description: 'Founded club; led team to national competition; created community STEM workshop', years: 3, hoursPerWeek: 12, category: 'STEM / Research' },
        { id: 'ec5', name: 'Research Lab', role: 'Research Intern', description: 'Published co-authored paper on machine learning in bioinformatics', years: 2, hoursPerWeek: 8, category: 'Work / Internship' },
      ],
    },
    {
      email: 'james@beta.admitsonly.com',
      gpa: 3.45, gpaScale: '4.0', satMath: 620, satRW: 580,
      extracurriculars: [
        { id: 'ec6', name: 'Basketball', role: 'Point Guard', description: 'Varsity starter; led team in assists for 2 consecutive seasons', years: 4, hoursPerWeek: 15, category: 'Athletics' },
        { id: 'ec7', name: 'Youth Mentorship', role: 'Mentor', description: 'Mentored 5 middle school students weekly through community center program', years: 2, hoursPerWeek: 4, category: 'Community Service' },
      ],
    },
  ];

  for (const p of profiles) {
    const userId = userIds[p.email];
    if (!userId) continue;

    // Compute scores server-side
    const gpaScore = Math.min((p.gpa / 4.0) * 100, 100);
    const totalSAT = p.satMath + p.satRW;
    const satScore = Math.min(((totalSAT - 400) / 1200) * 100, 100);
    const ecScore = Math.min(50 + p.extracurriculars.length * 10, 100);
    const holistic = Math.round(gpaScore * 0.35 + satScore * 0.30 + ecScore * 0.35);

    await prisma.studentProfile.create({
      data: {
        userId,
        gpa: p.gpa,
        gpaScale: p.gpaScale,
        satMath: p.satMath,
        satRW: p.satRW,
        extracurriculars: p.extracurriculars,
        holisticScore: holistic,
        percentile: Math.min(holistic + 5, 99),
        gpaScore: Math.round(gpaScore),
        satScore: Math.round(satScore),
        ecScore,
      },
    });
    console.log(`  Profile created for ${p.email}`);
  }

  // ─── Essays ───
  const essays = [
    { email: 'maya@beta.admitsonly.com', title: 'Finding My Voice Through Debate', prompt: 'Common App: Some students have a background that is so central to their identity that they believe their application would be incomplete without it.', content: 'The first time I stood behind a podium, my hands trembled so violently I could barely hold my notes. Three years later, I would captain our debate team to the state finals—but this essay is not about winning trophies.\n\nIt is about the Tuesday afternoon when a sophomore on my team told me she almost quit because she felt her accent made her sound "less American." I remembered feeling the same way as a freshman, carefully flattening every syllable to fit in.\n\nInstead of giving her a pep talk, I restructured our practice sessions. We began each meeting sharing stories from our diverse backgrounds. I learned that authentic voices carry more persuasive power than polished performances.', status: 'Complete', overallScore: 87 },
    { email: 'maya@beta.admitsonly.com', title: 'Why Princeton', prompt: 'Please tell us how you would contribute to the Princeton community.', content: 'Princeton\'s Pace Center for Civic Engagement aligns perfectly with my commitment to using communication skills for community impact. I envision launching a debate workshop program that pairs Princeton students with local Trenton high school students.', status: 'In Review', overallScore: null },
    { email: 'aisha@beta.admitsonly.com', title: 'The Algorithm That Changed Everything', prompt: 'Describe an experience where you faced a challenge and what you learned.', content: 'When my machine learning model produced biased results that disproportionately affected minority groups in our bioinformatics research, I realized that technical excellence without ethical awareness is dangerous. This led me to create an ethics review step in our lab\'s research pipeline—a small change that sparked a department-wide conversation about responsible AI.', status: 'Complete', overallScore: 82 },
    { email: 'aisha@beta.admitsonly.com', title: 'Building the Future', prompt: 'What motivates you to pursue STEM?', content: '', status: 'Draft', overallScore: null },
    { email: 'james@beta.admitsonly.com', title: 'More Than a Game', prompt: 'Reflect on something that someone has done for you that has made you happy or thankful in a surprising way.', content: 'Coach Davis did not congratulate me after my first triple-double. Instead, he asked me to stay after practice and showed me game film—not of my highlights, but of every teammate I had ignored on the court while chasing my own stats. That conversation changed how I think about leadership.', status: 'In Review', overallScore: null },
    { email: 'james@beta.admitsonly.com', title: 'Community Courts', prompt: 'Describe an extracurricular activity that is meaningful to you.', content: 'Every Saturday morning, I run a free basketball clinic at the community center for kids who cannot afford summer camps.', status: 'Draft', overallScore: null },
  ];

  for (const e of essays) {
    const userId = userIds[e.email];
    if (!userId) continue;
    await prisma.essay.create({
      data: {
        userId,
        title: e.title,
        prompt: e.prompt,
        content: e.content,
        status: e.status,
        overallScore: e.overallScore,
      },
    });
  }
  console.log(`  Created ${essays.length} essays`);

  // ─── Study Pod ───
  // Clean up old pods first
  await prisma.podMessage.deleteMany({});
  await prisma.podMember.deleteMany({});
  await prisma.studyPod.deleteMany({});

  const pod = await prisma.studyPod.create({
    data: {
      name: 'Essay Review Group',
      description: 'Weekly peer review sessions for college application essays',
      inviteCode: 'ESSAY2026',
    },
  });

  const studentEmails = ['maya@beta.admitsonly.com', 'aisha@beta.admitsonly.com', 'james@beta.admitsonly.com'];
  for (let i = 0; i < studentEmails.length; i++) {
    const userId = userIds[studentEmails[i]];
    if (!userId) continue;
    await prisma.podMember.create({
      data: { podId: pod.id, userId, role: i === 0 ? 'admin' : 'member' },
    });
  }

  // Pod messages
  const messages = [
    { email: 'maya@beta.admitsonly.com', content: 'Hey everyone! I just uploaded my Common App essay draft. Would love feedback on the opening paragraph.', type: 'discussion' },
    { email: 'aisha@beta.admitsonly.com', content: 'Read it! Strong opening—I think the debate metaphor works well. Maybe add a specific sensory detail?', type: 'feedback' },
    { email: 'james@beta.admitsonly.com', content: 'Agreed with Aisha. Also, I shared my essay about basketball—would appreciate thoughts on whether the ending lands.', type: 'essay_share' },
    { email: 'maya@beta.admitsonly.com', content: 'James, the Coach Davis anecdote is powerful. The ending feels a bit abrupt though—maybe connect it back to your mentorship work?', type: 'feedback' },
    { email: 'aisha@beta.admitsonly.com', content: 'Should we schedule a video call this weekend to do live reviews? I find real-time feedback so much more helpful.', type: 'discussion' },
  ];

  for (const msg of messages) {
    const userId = userIds[msg.email];
    if (!userId) continue;
    await prisma.podMessage.create({
      data: { podId: pod.id, userId, content: msg.content, type: msg.type },
    });
  }
  console.log(`  Created pod "${pod.name}" with ${studentEmails.length} members and ${messages.length} messages`);

  console.log('Seeding complete — demo data ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
