import type { Metadata } from 'next';
import { ArrowUpRight01Icon } from 'hugeicons-react';

import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { Container } from '@/components/landing/container';
import { Eyebrow, Section, SectionHeader } from '@/components/landing/section';
import { Reveal } from '@/components/landing/reveal';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const API_ORIGIN = API_URL.replace(/\/api\/v1\/?$/, '');
const API_DOCS_URL = `${API_ORIGIN}/api/docs`;

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const metadata: Metadata = {
  title: 'Docs — Scorra',
  description:
    'Learn how to use Scorra — the quality evaluation platform for AI applications. Guides on datasets, evaluation tasks, comparisons, rankings, analytics, and the API.',
};

const GUIDES = [
  {
    title: 'Getting Started',
    items: [
      {
        heading: 'What is Scorra?',
        body: [
          'Scorra is a quality evaluation platform for AI applications. It helps teams turn human and AI judgment into measurable, auditable evidence — so every model release comes with numbers, not vibes.',
          'You upload datasets of prompts, create evaluation tasks, and collect structured judgments: single scores, pairwise comparisons, or rankings. Results feed analytics, agreement metrics, and exports that plug into your existing workflows.',
        ],
      },
      {
        heading: 'Your first organization',
        body: [
          'When you sign up, Scorra creates an organization for you. An organization is the top-level container for your datasets, tasks, members, and evaluation results.',
          'You can create multiple organizations if you work across different teams or clients. Use the organization switcher in the sidebar to move between them.',
          'Organization owners can invite members and assign roles: Owners manage the organization and billing, Admins manage members and tasks, and Evaluators complete evaluation tasks.',
        ],
      },
      {
        heading: 'The evaluation workflow',
        body: [
          'Every evaluation in Scorra follows the same core loop:',
          '1. <strong>Upload a dataset</strong> — a CSV or tab-separated file with prompts and, optionally, model responses you want judged.',
          '2. <strong>Create an evaluation task</strong> — define what you are measuring: a single score per item, a pairwise A-vs-B comparison, or a ranking of several responses.',
          '3. <strong>Set your criteria</strong> — choose score dimensions like accuracy, tone, or helpfulness, and optional rubric guidance for evaluators.',
          '4. <strong>Invite evaluators</strong> — internal team members or external contractors receive items to judge one at a time.',
          '5. <strong>Review results</strong> — analytics show score distributions, inter-rater agreement, and per-evaluator consistency.',
          '6. <strong>Export and act</strong> — download results as CSV and feed them into your model iteration or deployment approval process.',
        ],
      },
    ],
  },
  {
    title: 'Datasets',
    items: [
      {
        heading: 'What is a dataset?',
        body: [
          'A dataset is a collection of evaluation items — typically prompts and the model responses you want judged. Datasets are reusable: you can attach the same dataset to multiple evaluation tasks as your prompts or models evolve.',
          'Each item can include:',
          '- A <strong>prompt</strong> — the input given to the model.',
          '- One or more <strong>responses</strong> — the model outputs to evaluate (for comparisons and rankings).',
          '- Optional <strong>metadata</strong> — extra columns like source, category, or model version that help you filter and analyze results.',
        ],
      },
      {
        heading: 'Supported formats',
        body: [
          'Scorra accepts CSV and TSV files. The header row defines your fields; the most common columns are <code>prompt</code>, <code>response_a</code>, <code>response_b</code>, and any metadata columns you want to keep.',
          'When you create a dataset via the UI you can paste sample rows to preview how Scorra will parse your file. When using the API, specify the format explicitly.',
        ],
      },
      {
        heading: 'Managing datasets',
        body: [
          "Datasets live under your organization and are shared with all members. You can edit a dataset's name and description at any time. If you upload a new file to an existing dataset, the items are replaced — use a new dataset for a new version of your benchmark.",
          'For programmatic management, see the Datasets API section below.',
        ],
      },
    ],
  },
  {
    title: 'Evaluation Tasks',
    items: [
      {
        heading: 'Types of evaluation',
        body: [
          'Scorra supports three evaluation types, chosen when you create a task:',
          '- <strong>Single scoring</strong> — an evaluator assigns scores to one response per dimension (e.g., accuracy 1-5, tone 1-5). Best for absolute quality judgments.',
          '- <strong>Pairwise comparison</strong> — an evaluator sees two responses side by side and picks the better one, optionally scoring each dimension. Best for head-to-head model comparisons.',
          '- <strong>Ranking</strong> — an evaluator orders three or more responses from best to worst. Best for tuning among several candidate models.',
        ],
      },
      {
        heading: 'Score dimensions and rubrics',
        body: [
          'Dimensions are the aspects you want evaluators to judge. Common choices are accuracy, relevance, tone, safety, and helpfulness. Each dimension can have its own scale (e.g., 1-5 or 0-10) and optional rubric text that guides evaluators on what each score means.',
          'Rubrics matter. A dimension called "accuracy" without guidance produces noisy data. A dimension with a one-line rubric per score level produces data you can trust and compare across evaluators.',
        ],
      },
      {
        heading: 'Task settings',
        body: [
          'When creating a task you can configure:',
          '- <strong>Title and description</strong> — what the evaluators will see.',
          '- <strong>Evaluation type</strong> — single, pairwise, or ranking.',
          '- <strong>Score dimensions</strong> — what is being measured.',
          '- <strong>Items per evaluator</strong> — how many items each evaluator receives (used for distributing work and measuring agreement).',
          '- <strong>Auto-activation</strong> — whether new items are released to evaluators automatically as they finish.',
        ],
      },
      {
        heading: 'Running and monitoring a task',
        body: [
          'Once a task is active, evaluators pick up items one at a time from their dashboard. You can pause a task at any time to stop new work from being submitted.',
          'The task progress view shows completion percentage, throughput per evaluator, and how many items remain. The disagreement view highlights items where evaluators diverged — useful for finding ambiguous prompts or unclear rubrics.',
          'When the task is complete, results are available for analytics and export.',
        ],
      },
    ],
  },
  {
    title: 'Comparisons & Rankings',
    items: [
      {
        heading: 'Pairwise comparisons',
        body: [
          'In a pairwise task, each item presents two responses (A and B) and the evaluator chooses which is better — or whether they are tied. Dimensions can be scored independently for each response, giving you both a verdict and a granular breakdown.',
          'Aggregated comparison results show win rates per response, per dimension, and can be filtered by evaluator or time range.',
        ],
      },
      {
        heading: 'Rankings',
        body: [
          'In a ranking task, each item presents three or more responses and the evaluator orders them from best to worst. This is especially useful when you are comparing several model variants or prompt versions at once.',
          'Ranked results can be aggregated into an overall ranking across all items, with confidence estimates based on how often each response was placed at each position.',
        ],
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        heading: 'Dashboard overview',
        body: [
          'The organization-level analytics dashboard gives you a snapshot of activity: how many tasks are running, how many evaluations have been completed, and how evaluators are performing.',
        ],
      },
      {
        heading: 'Inter-rater agreement',
        body: [
          'Agreement metrics tell you whether your evaluators are consistent. Scorra computes agreement scores per task so you can spot dimensions or items where evaluators diverge — often a sign that the rubric needs clarification.',
        ],
      },
      {
        heading: 'Score distributions',
        body: [
          "Score distribution charts show how responses are distributed across each dimension's scale. Shifts in the distribution over time can indicate model improvement or regression.",
        ],
      },
      {
        heading: 'Evaluator metrics',
        body: [
          'Evaluator throughput and consistency metrics help you manage your reviewer pool — who is keeping up, who may need more guidance, and whether agreement is holding across the team.',
        ],
      },
    ],
  },
  {
    title: 'Exports',
    items: [
      {
        heading: 'Exporting results',
        body: [
          'You can request an export of evaluation results at any time. Exports are generated asynchronously and made available for download once ready.',
          'Supported formats include CSV, which you can open in spreadsheets or feed into your own analysis pipelines. Exports include the item data, the scores or verdicts, evaluator identity, and timestamps.',
        ],
      },
    ],
  },
  {
    title: 'API Reference',
    items: [
      {
        heading: 'Base URL and versioning',
        body: [
          `All API requests go to <code>${API_URL}</code>. The API is versioned via the URL path — currently <code>v1</code>.`,
          `The full interactive API reference is available at the <a href="${API_DOCS_URL}" target="_blank" rel="noopener noreferrer" class="font-semibold text-ink underline-offset-2 hover:underline">Swagger docs</a>.`,
        ],
      },
      {
        heading: 'Authentication',
        body: [
          'The API supports two authentication methods:',
          '- <strong>Bearer token (JWT)</strong> — included in the <code>Authorization: Bearer &lt;token&gt;</code> header. Obtain a token by logging in via the Auth API.',
          '- <strong>API key</strong> — included in the <code>X-API-Key</code> header. API keys are useful for server-to-server integration and long-running jobs.',
          'Most endpoints require a valid Bearer token. Some invitation endpoints are public and do not require authentication.',
        ],
      },
      {
        heading: 'Auth endpoints',
        body: [
          '<code>POST /auth/register</code> — Create a new user and organization.',
          '<code>POST /auth/login</code> — Log in with email and password, receive a JWT pair.',
          '<code>POST /auth/refresh</code> — Refresh an access token using a valid refresh token.',
          '<code>POST /auth/logout</code> — Revoke the current tokens.',
          '<code>GET /auth/me</code> — Get the currently authenticated user.',
          '<code>POST /auth/switch-org/:orgId</code> — Switch the active organization for the session.',
        ],
      },
      {
        heading: 'Organizations',
        body: [
          '<code>GET /organizations</code> — List organizations for the current user.',
          '<code>POST /organizations</code> — Create a new organization.',
          '<code>GET /organizations/:id</code> — Get organization details.',
          '<code>PATCH /organizations/:id</code> — Update organization settings.',
          '<code>GET /organizations/:id/members</code> — List members.',
          "<code>PATCH /organizations/:id/members/:userId</code> — Change a member's role.",
          '<code>DELETE /organizations/:id/members/:userId</code> — Remove a member.',
          '<code>POST /organizations/:id/invitations</code> — Invite a user by email.',
          '<code>POST /organizations/:id/invitations/:invitationId/resend</code> — Resend an invitation.',
          '<code>DELETE /organizations/:id/invitations/:invitationId</code> — Revoke an invitation.',
        ],
      },
      {
        heading: 'Datasets',
        body: [
          '<code>POST /datasets</code> — Create a new dataset.',
          '<code>GET /datasets</code> — List datasets in the organization.',
          '<code>GET /datasets/:id</code> — Get a dataset by ID.',
          '<code>PATCH /datasets/:id</code> — Update a dataset.',
          '<code>DELETE /datasets/:id</code> — Delete a dataset.',
          '<code>POST /datasets/:id/upload</code> — Upload items to a dataset (file upload).',
        ],
      },
      {
        heading: 'Evaluation tasks',
        body: [
          '<code>POST /evaluations/tasks</code> — Create an evaluation task.',
          '<code>GET /evaluations/tasks</code> — List tasks in the organization.',
          '<code>GET /evaluations/tasks/:taskId</code> — Get a task by ID.',
          '<code>PATCH /evaluations/tasks/:taskId</code> — Update a task.',
          '<code>POST /evaluations/tasks/:taskId/activate</code> — Activate a task.',
          '<code>POST /evaluations/tasks/:taskId/pause</code> — Pause a task.',
          '<code>GET /evaluations/tasks/:taskId/progress</code> — Get completion progress.',
          '<code>GET /evaluations/tasks/:taskId/disagreement</code> — Analyze evaluator disagreement.',
          '<code>GET /evaluations/tasks/:taskId/summary</code> — Summarize evaluator feedback.',
          '<code>GET /evaluations/tasks/:taskId/next</code> — Get the next item to evaluate.',
          '<code>POST /evaluations/submit</code> — Submit an evaluation.',
          '<code>POST /evaluations/auto-label</code> — Auto-label an evaluation comment with AI.',
          '<code>POST /evaluations/:evaluationId/ai-suggestions</code> — Request AI suggestions.',
          '<code>GET /evaluations/tasks/:taskId/results</code> — Get all evaluations for a task.',
        ],
      },
      {
        heading: 'Comparisons & rankings',
        body: [
          '<code>GET /comparisons/:taskId/next</code> — Get the next uncompared pair.',
          '<code>POST /comparisons</code> — Submit a pairwise comparison verdict.',
          '<code>GET /comparisons/:taskId/results</code> — Get aggregated comparison results.',
          '<code>GET /comparisons/:taskId/comparisons</code> — List individual comparisons.',
          '<code>GET /rankings/:taskId/next</code> — Get the next unranked set.',
          '<code>POST /rankings</code> — Submit a ranking.',
          '<code>GET /rankings/:taskId/rankings</code> — List individual rankings.',
        ],
      },
      {
        heading: 'Analytics & exports',
        body: [
          '<code>GET /analytics/dashboard</code> — Org-level analytics overview.',
          '<code>GET /analytics/tasks/:taskId/agreement</code> — Inter-rater agreement metrics.',
          '<code>GET /analytics/tasks/:taskId/scores</code> — Score distribution.',
          '<code>GET /analytics/evaluators</code> — Evaluator throughput and consistency.',
          '<code>POST /exports</code> — Request a new export.',
          '<code>GET /exports</code> — List exports for the organization.',
          '<code>GET /exports/:id/download</code> — Download a ready export file.',
        ],
      },
      {
        heading: 'Example: creating a task via the API',
        body: [
          'Here is a minimal example of creating a single-scoring evaluation task:',
          '<pre class="mt-3 overflow-x-auto rounded-lg bg-ink/5 p-4 text-[13px] leading-[1.6] text-ink-700 font-mono"><code>const res = await fetch("http://localhost:3001/api/v1/evaluations/tasks", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "Authorization": `Bearer ${token}`,\n  },\n  body: JSON.stringify({\n    title: "GPT-4 vs Claude — help quality",\n    description: "Score helpfulness and accuracy for each response.",\n    datasetId: "abc123",\n    evaluationType: "single",\n    dimensions: [\n      { name: "helpfulness", scale: 1, upperBound: 5, rubric: "How well does the response help the user?" },\n      { name: "accuracy", scale: 1, upperBound: 5, rubric: "Is the information correct and complete?" },\n    ],\n  }),\n});\n\nconst task = await res.json();</code></pre>',
          'The response includes the task ID and configuration. Use <code>GET /evaluations/tasks/:taskId/next</code> to fetch items for evaluators, and <code>POST /evaluations/submit</code> to submit their judgments.',
        ],
      },
    ],
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Create an account',
    body: 'Sign up at Scorra. A new organization is created for you automatically.',
  },
  {
    num: '02',
    title: 'Upload a dataset',
    body: 'Upload a CSV or TSV with your prompts and model responses, or create one via the API.',
  },
  {
    num: '03',
    title: 'Create an evaluation task',
    body: 'Choose single, pairwise, or ranking. Define your score dimensions and rubrics.',
  },
  {
    num: '04',
    title: 'Invite evaluators',
    body: 'Share the task with your team or external reviewers. They judge items from their dashboard.',
  },
  {
    num: '05',
    title: 'Review results',
    body: 'Use analytics to check agreement, score distributions, and evaluator consistency.',
  },
  {
    num: '06',
    title: 'Export and iterate',
    body: 'Download results as CSV and feed them into your model development or release process.',
  },
];

function pad(index: number) {
  return String(index).padStart(2, '0');
}

/**
 * Guide copy is authored as raw HTML, so the inline tags are given the landing
 * page's styling here. Any lingering local API origin in the copy is swapped for
 * the configured one so production never links visitors to `localhost`.
 */
function richText(html: string) {
  return html
    .replace(/<pre class="[^"]*"/, '<pre')
    .replace(
      /<code>/g,
      '<code class="rounded-[4px] bg-ink-100 px-1.5 py-0.5 font-mono text-[12.5px] text-ink-700">',
    )
    .replace(/<strong>/g, '<strong class="font-semibold text-ink">')
    .replace(/http:\/\/localhost:3001/g, API_ORIGIN);
}

type BlockKind = 'p' | 'code' | 'bullets' | 'steps' | 'endpoints';

type GroupBlock = { kind: 'bullets' | 'steps' | 'endpoints'; items: string[] };

type Block = { kind: 'p'; html: string } | { kind: 'code'; html: string } | GroupBlock;

function blockKind(line: string): BlockKind {
  const text = line.trimStart();
  if (text.startsWith('<pre')) return 'code';
  if (text.startsWith('- ')) return 'bullets';
  if (/^\d+\.\s/.test(text)) return 'steps';
  if (/^<code>(GET|POST|PUT|PATCH|DELETE)\b/.test(text)) return 'endpoints';
  return 'p';
}

/** Content is authored as a flat array of lines; group the list-like runs. */
function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let group: GroupBlock | null = null;

  const flush = () => {
    if (group) blocks.push(group);
    group = null;
  };

  for (const line of lines) {
    const kind = blockKind(line);
    const text = line.trimStart();

    if (kind === 'code') {
      flush();
      blocks.push({ kind: 'code', html: line });
      continue;
    }

    if (kind === 'p') {
      flush();
      blocks.push({ kind: 'p', html: line });
      continue;
    }

    const item = kind === 'bullets' ? text.slice(2) : text.replace(/^\d+\.\s*/, '');

    if (group && group.kind === kind) {
      group.items.push(item);
    } else {
      flush();
      group = { kind, items: [item] };
    }
  }

  flush();
  return blocks;
}

function GuideBody({ lines }: { lines: string[] }) {
  return (
    <div className="mt-3 space-y-3 [&_code]:break-words">
      {parseBlocks(lines).map((block, index) => {
        if (block.kind === 'code') {
          return (
            <div
              key={index}
              className="overflow-x-auto rounded-2xl bg-ink p-5 text-[12.5px] leading-[1.7] text-ink-200 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_pre]:m-0 [&_pre]:font-mono"
              dangerouslySetInnerHTML={{ __html: richText(block.html) }}
            />
          );
        }

        if (block.kind === 'p') {
          return (
            <p
              key={index}
              className="text-[13.5px] leading-[1.65] text-ink-500"
              dangerouslySetInnerHTML={{ __html: richText(block.html) }}
            />
          );
        }

        if (block.kind === 'steps') {
          return (
            <ol key={index} className="space-y-2.5">
              {block.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-[1.65] text-ink-500">
                  <span className="font-mono text-[11px] text-ink-400">{pad(i + 1)}</span>
                  <span dangerouslySetInnerHTML={{ __html: richText(item) }} />
                </li>
              ))}
            </ol>
          );
        }

        if (block.kind === 'endpoints') {
          return (
            <ul key={index} className="space-y-2">
              {block.items.map((item, i) => (
                <li
                  key={i}
                  className="text-[12.5px] leading-[1.6] text-ink-500"
                  dangerouslySetInnerHTML={{ __html: richText(item) }}
                />
              ))}
            </ul>
          );
        }

        return (
          <ul key={index} className="space-y-2">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-[1.65] text-ink-500">
                <span aria-hidden className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-ink-300" />
                <span dangerouslySetInnerHTML={{ __html: richText(item) }} />
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

export default function DocsPage() {
  return (
    <>
      <Navbar />

      <main>
        <section className="border-b border-ink-200 bg-paper">
          <Container>
            <div className="pt-10 pb-8 md:pt-14 md:pb-10">
              <Eyebrow>Documentation</Eyebrow>
              <h1 className="mt-4 text-[clamp(26px,3vw,38px)] text-ink">How to use Scorra</h1>
              <p className="mt-3 max-w-180 text-[14.5px] leading-[1.65] text-ink-500">
                Everything you need to evaluate AI responses, collect structured judgment from your
                team, and back every deployment with evidence.
              </p>

              <nav aria-label="On this page" className="mt-7 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">
                  On this page
                </span>
                <a
                  href="#workflow-at-a-glance"
                  className="rounded-md border border-ink-200 px-2.5 py-1 font-mono text-[11px] text-ink-500 transition-colors hover:border-ink-400 hover:text-ink"
                >
                  Workflow
                </a>
                {GUIDES.map((guide) => (
                  <a
                    key={guide.title}
                    href={`#${slug(guide.title)}`}
                    className="rounded-md border border-ink-200 px-2.5 py-1 font-mono text-[11px] text-ink-500 transition-colors hover:border-ink-400 hover:text-ink"
                  >
                    {guide.title}
                  </a>
                ))}
                <a
                  href={API_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border-ink bg-ink px-2.5 py-1 font-mono text-[11px] text-white transition-colors hover:bg-ink-700"
                >
                  Open API reference
                </a>
              </nav>
            </div>
          </Container>
        </section>

        <Section id="workflow-at-a-glance" alt>
          <Container>
            <SectionHeader
              eyebrow="The evaluation loop"
              title={
                <>
                  The workflow <span className="text-ink-400">at a glance</span>
                </>
              }
              description="Six steps from an empty organization to evidence you can put in front of a release review."
            />

            <div className="grid gap-4 sm:grid-cols-2 md:gap-4.5 lg:grid-cols-3">
              {STEPS.map((step) => (
                <Reveal
                  key={step.num}
                  className="min-w-0 rounded-2xl border border-ink-200 bg-paper p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink-400"
                >
                  <p className="mb-4 font-mono text-xs text-ink-400">{step.num}</p>
                  <h3 className="mb-2 text-[17px]">{step.title}</h3>
                  <p className="text-[13px] leading-[1.55] text-ink-500">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>

        {GUIDES.map((guide, index) => {
          const alt = index % 2 === 1;

          return (
            <Section key={guide.title} id={slug(guide.title)} alt={alt}>
              <Container>
                <SectionHeader eyebrow={`Guide ${pad(index + 1)}`} title={guide.title} />

                <div className="grid items-start gap-4 md:gap-4.5 lg:grid-cols-2">
                  {guide.items.map((item) => (
                    <Reveal
                      key={item.heading}
                      className={cn(
                        'min-w-0 rounded-2xl border border-ink-200 p-6 transition-colors duration-300 hover:border-ink-400 md:p-7',
                        alt ? 'bg-paper' : 'bg-white',
                      )}
                    >
                      <h3 className="text-[17px]">{item.heading}</h3>
                      <GuideBody lines={item.body} />
                    </Reveal>
                  ))}
                </div>

                {guide.title === 'API Reference' && (
                  <Reveal className="mt-4 md:mt-4.5">
                    <div className="relative overflow-hidden rounded-3xl bg-ink px-7 py-12 text-white md:px-12 md:py-14">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 0%, rgba(255,255,255,.07), transparent 55%)',
                        }}
                      />
                      <div className="relative flex flex-col items-start gap-7 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-[clamp(22px,2.6vw,30px)]">Try the API live</h3>
                          <p className="mt-3 max-w-110 text-[14.5px] leading-[1.6] text-ink-400">
                            The interactive reference documents every request and response schema,
                            the authentication schemes, and lets you call endpoints without leaving
                            the browser.
                          </p>
                        </div>
                        <Button variant="inverse" size="lg" asChild>
                          <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer">
                            Open API reference
                            <ArrowUpRight01Icon size={16} />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Reveal>
                )}
              </Container>
            </Section>
          );
        })}
      </main>

      <Footer />
    </>
  );
}
