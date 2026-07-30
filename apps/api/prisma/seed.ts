import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Clean existing data (respect FK constraints) ─────────
  await prisma.auditLog.deleteMany();
  await prisma.rankingEntry.deleteMany();
  await prisma.rankingResult.deleteMany();
  await prisma.pairwiseComparison.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.export.deleteMany();
  await prisma.modelResponse.deleteMany();
  await prisma.datasetRow.deleteMany();
  await prisma.datasetVersion.deleteMany();
  await prisma.evaluationTask.deleteMany(); // before datasets (FK)
  await prisma.dataset.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('  ✓ Cleaned existing data');

  // ── Password ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Organization ─────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Org',
      slug: 'demo-org',
      plan: 'FREE',
      settings: { maxEvaluators: 10, maxDatasets: 20 },
    },
  });
  console.log(`  ✓ Organization: ${org.name} (${org.slug})`);

  // ── Users ────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@scorra.dev',
      passwordHash,
      name: 'Alice Admin',
      role: 'ORG_ADMIN',
      status: 'ACTIVE',
    },
  });

  const evaluator = await prisma.user.create({
    data: {
      email: 'eval@scorra.dev',
      passwordHash,
      name: 'Bob Evaluator',
      role: 'EVALUATOR',
      status: 'ACTIVE',
    },
  });

  const evaluator2 = await prisma.user.create({
    data: {
      email: 'carol@scorra.dev',
      passwordHash,
      name: 'Carol Reviewer',
      role: 'EVALUATOR',
      status: 'ACTIVE',
    },
  });

  console.log(`  ✓ Users: ${admin.email}, ${evaluator.email}, ${evaluator2.email}`);

  // ── Memberships ──────────────────────────────────────────
  await prisma.organizationMember.createMany({
    data: [
      { userId: admin.id, organizationId: org.id, role: 'ORG_ADMIN' },
      { userId: evaluator.id, organizationId: org.id, role: 'EVALUATOR' },
      { userId: evaluator2.id, organizationId: org.id, role: 'EVALUATOR' },
    ],
  });
  console.log('  ✓ Memberships: 3 members linked to Demo Org');

  // ── Dataset ──────────────────────────────────────────────
  const dataset = await prisma.dataset.create({
    data: {
      name: 'Customer Support Quality Benchmark',
      description:
        'A diverse set of customer support prompts covering refunds, troubleshooting, account issues, and general inquiries. Used to evaluate AI response quality across multiple dimensions.',
      organizationId: org.id,
      createdById: admin.id,
      format: 'JSON',
      status: 'READY',
      rowCount: 8,
      tags: ['customer-support', 'benchmark', 'v1'],
    },
  });
  console.log(`  ✓ Dataset: ${dataset.name} (8 rows)`);

  // ── Dataset Rows ─────────────────────────────────────────
  const prompts = [
    {
      prompt: 'A customer says their package arrived damaged. The item inside is broken. They want a full refund. How should we respond?',
      promptType: 'COMPLETION' as const,
      context: 'You are a customer support agent for an e-commerce company. Be empathetic, solution-oriented, and follow the refund policy.',
      expectedOutput: 'Apologize sincerely, offer an immediate full refund or replacement, provide a prepaid return label, and assure the customer this will be handled promptly.',
    },
    {
      prompt: 'I forgot my password and can\'t log into my account. I\'ve tried the reset link but it\'s not working. Help!',
      promptType: 'COMPLETION' as const,
      context: 'You are a technical support agent for a SaaS platform. Be patient and methodical.',
      expectedOutput: 'Acknowledge frustration, walk through alternative reset methods (check spam folder, try different browser, manual reset by support), verify identity, and ensure resolution.',
    },
    {
      prompt: 'Can you explain why my bill increased by $45 this month? I haven\'t changed my plan.',
      promptType: 'COMPLETION' as const,
      context: 'You are a billing support agent. Be transparent and detailed.',
      expectedOutput: 'Explain the specific charges (overages, add-ons, prorated fees), provide a breakdown, offer to review the account, and suggest ways to reduce future bills.',
    },
    {
      prompt: 'I want to cancel my subscription. The product is too complicated and I don\'t have time to learn it.',
      promptType: 'COMPLETION' as const,
      context: 'You are a retention specialist. Balance respecting the customer\'s decision with offering value.',
      expectedOutput: 'Acknowledge their frustration, ask what specifically was difficult, offer 1:1 onboarding or simplified plan, but respect the cancellation if they insist. Make cancellation easy.',
    },
    {
      prompt: 'Is my personal data safe with your platform? I\'m concerned about recent data breaches in the news.',
      promptType: 'COMPLETION' as const,
      context: 'You are a trust & safety representative. Be factual and reassuring without making promises you can\'t keep.',
      expectedOutput: 'Explain encryption standards (AES-256, TLS 1.3), SOC 2 compliance status, data residency options, bug bounty program, and offer to connect with the security team for more details.',
    },
    {
      prompt: 'Your AI chatbot gave me completely wrong information about the return policy. I almost shipped my item to the wrong address!',
      promptType: 'COMPLETION' as const,
      context: 'You are an escalated support agent handling an AI error complaint. Be accountable and rebuild trust.',
      expectedOutput: 'Apologize sincerely without blaming the AI, provide the correct return policy details, offer a goodwill gesture (discount, expedited shipping), and assure them this feedback will improve the system.',
    },
    {
      prompt: 'I need to export all my data before the end of the month. What formats do you support and how long does it take?',
      promptType: 'COMPLETION' as const,
      context: 'You are a data & integrations support agent. Be precise about capabilities and timelines.',
      expectedOutput: 'List supported formats (JSON, CSV, PDF), explain the export process, give timeline estimates based on data volume, offer to initiate the export immediately, and provide a tracking link.',
    },
    {
      prompt: 'Do you offer discounts for non-profits or educational institutions? We\'re a small university research lab.',
      promptType: 'COMPLETION' as const,
      context: 'You are a sales/support hybrid agent. Be helpful while following discount policies.',
      expectedOutput: 'Confirm non-profit/education discounts exist, explain the verification process, provide pricing tiers, offer to connect with the education sales team, and mention any free tier that might work in the meantime.',
    },
  ];

  const rows = [];
  for (let i = 0; i < prompts.length; i++) {
    const row = await prisma.datasetRow.create({
      data: {
        datasetId: dataset.id,
        rowIndex: i,
        prompt: prompts[i].prompt,
        promptType: prompts[i].promptType,
        context: prompts[i].context,
        expectedOutput: prompts[i].expectedOutput,
        metadata: { difficulty: i < 3 ? 'easy' : i < 6 ? 'medium' : 'hard' },
        tags: i < 4 ? ['billing', 'account'] : ['technical', 'security'],
      },
    });
    rows.push(row);
  }
  console.log(`  ✓ Dataset rows: ${rows.length} created`);

  // ── Model Responses ──────────────────────────────────────
  // Simulated responses from two different models for each prompt
  const modelResponsePairs = [
    // Row 0 — Damaged package
    {
      modelA: "I'm so sorry to hear your package arrived damaged! That's absolutely not the experience we want you to have. I've initiated a full refund of $XX.XX which should appear in your account within 3-5 business days. In the meantime, I'll email you a prepaid return label — no need to worry about shipping costs. Would you prefer a replacement instead? Either way, we'll make this right immediately.",
      modelB: 'We apologize for the damaged item. Please return it using the standard return process and we will process your refund within 14 days of receiving the item. Note that return shipping costs may apply.',
    },
    // Row 1 — Password reset
    {
      modelA: "I completely understand how frustrating that is — being locked out of your account is the last thing you need. Let's get this sorted step by step. First, could you check your spam/junk folder for the reset email? Sometimes they get filtered. If it's not there, try opening the reset link in an incognito/private browser window. Still no luck? No problem — I can manually trigger a reset from my end. I just need to verify your identity first. What's the email address associated with your account?",
      modelB: 'Please try the password reset again. If it still does not work, contact our support team during business hours (9 AM - 5 PM EST).',
    },
    // Row 2 — Billing increase
    {
      modelA: "Great question — I can see exactly what happened. Looking at your account, the $45 increase breaks down into: $25 for additional API calls beyond your plan limit (you had 15,000 extra requests last month), and $20 for a new team member seat that was added on the 12th. I'd be happy to review your usage patterns and suggest a plan that might be more cost-effective. Would you like me to do that analysis?",
      modelB: 'Your bill increased because of usage. The details are in your billing dashboard.',
    },
    // Row 3 — Cancel subscription
    {
      modelA: "I hear you — if the platform feels overwhelming, that's on us, not you. Before you go, would you be open to a 20-minute 1:1 onboarding session with one of our specialists? Many users who felt the same way found that one guided session made everything click. Alternatively, we have a Lite plan at half the cost with a simpler interface. That said — if you'd prefer to cancel, I'll process that right now, no questions asked. What feels right to you?",
      modelB: 'Your subscription has been cancelled. You will lose access at the end of your billing period. Thank you for being a customer.',
    },
    // Row 4 — Data safety
    {
      modelA: "That's a completely valid concern, and I appreciate you asking. Here's how we protect your data: all information is encrypted using AES-256 at rest and TLS 1.3 in transit. We're SOC 2 Type II certified (happy to share the report), our infrastructure runs on isolated AWS VPCs, and we maintain a public bug bounty program with HackerOne. Data residency options include US, EU, and APAC regions. Would you like me to connect you with our security team for a more detailed walkthrough?",
      modelB: 'Yes, your data is safe. We use standard security measures.',
    },
    // Row 5 — AI chatbot error
    {
      modelA: "You're absolutely right to be upset — that should never have happened, and I'm genuinely sorry. The correct return policy is: items can be returned within 30 days to our warehouse at [correct address], with a prepaid label we provide. I've flagged this AI error to our quality team so they can improve the training data. As a goodwill gesture, I've added a $20 credit to your account and upgraded your next order to free expedited shipping. Is there anything else I can clarify about our policies?",
      modelB: 'Sorry about that. The correct return address is on our website. AI systems sometimes make mistakes.',
    },
    // Row 6 — Data export
    {
      modelA: "Absolutely — we support exports in JSON, CSV, and PDF formats. For an account your size, a full export typically completes within 2-4 hours. I can kick that off for you right now. You'll receive an email with a secure download link once it's ready, and the link will be valid for 7 days. Would you like me to start the export? Which format would you prefer?",
      modelB: 'We support data exports. Check your account settings for available options.',
    },
    // Row 7 — Non-profit discount
    {
      modelA: "We absolutely do! We offer a 30% discount for verified non-profits and educational institutions. The process is straightforward: just submit your institution's 501(c)(3) determination letter or accreditation document through our verification portal (I can send you the link). Once verified — usually within 1-2 business days — the discount is applied automatically. We also have an academic research grant program that provides free access for qualifying projects. Would you like me to send you information about both options?",
      modelB: 'We may offer discounts. Please contact our sales team for pricing information.',
    },
  ];

  const modelResponses = [];
  for (let i = 0; i < modelResponsePairs.length; i++) {
    const respA = await prisma.modelResponse.create({
      data: {
        datasetRowId: rows[i].id,
        modelId: 'gpt-4o',
        modelName: 'GPT-4o',
        provider: 'OPENAI',
        response: modelResponsePairs[i].modelA,
        promptTokens: [150, 120, 180, 140, 200, 160, 130, 170][i],
        completionTokens: [120, 80, 150, 110, 180, 140, 90, 160][i],
        latencyMs: [850, 720, 920, 680, 1100, 950, 780, 890][i],
        metadata: { temperature: 0.7, topP: 0.9 },
      },
    });

    const respB = await prisma.modelResponse.create({
      data: {
        datasetRowId: rows[i].id,
        modelId: 'claude-3-haiku',
        modelName: 'Claude 3 Haiku',
        provider: 'ANTHROPIC',
        response: modelResponsePairs[i].modelB,
        promptTokens: [140, 110, 170, 130, 190, 150, 120, 160][i],
        completionTokens: [60, 35, 50, 40, 45, 55, 38, 48][i],
        latencyMs: [320, 280, 350, 260, 400, 370, 300, 340][i],
        metadata: { temperature: 0.5, topP: 0.85 },
      },
    });

    modelResponses.push({ row: rows[i], respA, respB });
  }
  console.log(`  ✓ Model responses: ${modelResponses.length * 2} created (GPT-4o + Claude 3 Haiku per prompt)`);

  // ── Evaluation Tasks ─────────────────────────────────────
  const scoringCriteria = [
    {
      dimension: 'ACCURACY',
      label: 'Accuracy',
      description: 'Is the response factually correct and free of errors?',
      minScore: 1,
      maxScore: 10,
      weight: 0.3,
      required: true,
    },
    {
      dimension: 'HELPFULNESS',
      label: 'Helpfulness',
      description: 'Does the response actually solve the customer\'s problem?',
      minScore: 1,
      maxScore: 10,
      weight: 0.25,
      required: true,
    },
    {
      dimension: 'EMPATHY',
      label: 'Empathy & Tone',
      description: 'Is the tone appropriate, empathetic, and professional?',
      minScore: 1,
      maxScore: 10,
      weight: 0.2,
      required: true,
    },
    {
      dimension: 'CONCISENESS',
      label: 'Conciseness',
      description: 'Is the response appropriately detailed without being verbose?',
      minScore: 1,
      maxScore: 10,
      weight: 0.15,
      required: false,
    },
    {
      dimension: 'SAFETY',
      label: 'Safety',
      description: 'Does the response avoid harmful, biased, or policy-violating content?',
      minScore: 1,
      maxScore: 10,
      weight: 0.1,
      required: true,
    },
  ];

  // Single evaluation task
  const singleTask = await prisma.evaluationTask.create({
    data: {
      organizationId: org.id,
      datasetId: dataset.id,
      name: 'Model Quality Benchmark — July 2026',
      description: 'Evaluate GPT-4o vs Claude 3 Haiku on customer support response quality across 8 diverse scenarios. Focus on accuracy, helpfulness, empathy, conciseness, and safety.',
      type: 'SINGLE',
      status: 'ACTIVE',
      scoringCriteria,
      createdById: admin.id,
    },
  });

  // Pairwise comparison task
  const pairwiseTask = await prisma.evaluationTask.create({
    data: {
      organizationId: org.id,
      datasetId: dataset.id,
      name: 'GPT-4o vs Claude 3 Haiku — Head-to-Head',
      description: 'Blind pairwise comparison of GPT-4o and Claude 3 Haiku responses. Which model delivers better customer support?',
      type: 'PAIRWISE',
      status: 'ACTIVE',
      scoringCriteria,
      createdById: admin.id,
    },
  });

  console.log(`  ✓ Evaluation tasks: 2 created (SINGLE + PAIRWISE)`);

  // ── Task Assignments ─────────────────────────────────────
  await prisma.taskAssignment.createMany({
    data: [
      { taskId: singleTask.id, evaluatorId: evaluator.id },
      { taskId: singleTask.id, evaluatorId: evaluator2.id },
      { taskId: pairwiseTask.id, evaluatorId: evaluator.id },
      { taskId: pairwiseTask.id, evaluatorId: evaluator2.id },
    ],
  });
  console.log('  ✓ Task assignments: 4 created (2 evaluators × 2 tasks)');

  // ── Pre-submitted evaluations (for demo data) ────────────
  // Submit a few evaluations so analytics have data immediately
  const sampleScores = [
    { accuracy: 9, helpfulness: 9, empathy: 8, conciseness: 7, safety: 10, overall: 8.6 },
    { accuracy: 8, helpfulness: 8, empathy: 9, conciseness: 8, safety: 9, overall: 8.4 },
    { accuracy: 6, helpfulness: 5, empathy: 4, conciseness: 7, safety: 8, overall: 6.0 },
    { accuracy: 9, helpfulness: 8, empathy: 7, conciseness: 9, safety: 10, overall: 8.6 },
  ];

  for (let i = 0; i < 4; i++) {
    await prisma.evaluation.create({
      data: {
        taskId: singleTask.id,
        datasetRowId: rows[i].id,
        evaluatorId: i < 2 ? evaluator.id : evaluator2.id,
        status: 'COMPLETED',
        scores: [
          { dimension: 'ACCURACY', label: 'Accuracy', score: sampleScores[i].accuracy, confidence: 0.9, note: null },
          { dimension: 'HELPFULNESS', label: 'Helpfulness', score: sampleScores[i].helpfulness, confidence: 0.85, note: null },
          { dimension: 'EMPATHY', label: 'Empathy & Tone', score: sampleScores[i].empathy, confidence: 0.8, note: null },
          { dimension: 'CONCISENESS', label: 'Conciseness', score: sampleScores[i].conciseness, confidence: 0.75, note: null },
          { dimension: 'SAFETY', label: 'Safety', score: sampleScores[i].safety, confidence: 0.95, note: null },
        ],
        overallScore: sampleScores[i].overall,
        timeSpentSeconds: [120, 90, 60, 150][i],
        submittedAt: new Date(),
      },
    });
  }
  console.log('  ✓ Pre-submitted evaluations: 4 completed (for demo analytics)');

  // ── Summary ──────────────────────────────────────────────
  console.log('\n📊 Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log(`  Organization:  ${org.name} (${org.slug})`);
  console.log(`  Users:         ${3} (admin + 2 evaluators)`);
  console.log(`  Dataset:       ${dataset.name} (${rows.length} rows)`);
  console.log(`  Responses:     ${modelResponses.length * 2} (2 per row)`);
  console.log(`  Tasks:         ${2} (single + pairwise)`);
  console.log(`  Evaluations:   ${4} pre-submitted`);
  console.log('─────────────────────────────────────────');
  console.log('\n🔑 Login credentials:');
  console.log('  Admin:     admin@scorra.dev / password123');
  console.log('  Evaluator: eval@scorra.dev / password123');
  console.log('  Evaluator: carol@scorra.dev / password123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
