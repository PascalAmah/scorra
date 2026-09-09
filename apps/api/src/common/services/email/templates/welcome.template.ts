import { layout, CTA_BUTTON_HTML, escapeHtml, PARAGRAPH_HTML } from './layout';

export interface WelcomeEmailData {
  firstName: string;
  workspaceUrl: string;
}

export function renderWelcomeEmail(data: WelcomeEmailData): { subject: string; text: string; html: string } {
  const { firstName, workspaceUrl } = data;

  const subject = 'Welcome to Scorra';

  const text = [
    `Welcome to Scorra, ${firstName}!`,
    ``,
    `Your workspace is live. Scorra is the quality operating system for AI applications — import a dataset, collect responses, and get human + AI evaluation working together on a single agreement metric you can defend.`,
    ``,
    `Go to your workspace:`,
    `${workspaceUrl}`,
    ``,
    `Three things worth doing first:`,
    `01 / IMPORT — Upload your first dataset as CSV, JSON, or JSONL.`,
    `02 / INVITE — Bring evaluators into your workspace to start scoring.`,
    `03 / EVALUATE — Run your first single, pairwise, or ranked evaluation.`,
    ``,
    `Need a hand getting started? Reply to this email or reach us at support@scorra.ai.`,
    ``,
    `— The Scorra Team`,
  ].join('\n');

  const html = layout({
    preheader: 'Your Scorra workspace is ready. Import a dataset and run your first evaluation.',
    eyebrow: 'ACCOUNT CREATED',
    title: `Welcome to Scorra, ${escapeHtml(firstName)}`,
    bodyHtml: `
              ${PARAGRAPH_HTML(
                `Your workspace is live. Scorra is the quality operating system for AI applications &mdash; import a dataset, collect responses, and get human + AI evaluation working together on a single agreement metric you can defend.`,
              )}
              ${CTA_BUTTON_HTML(workspaceUrl, 'Go to your workspace &nbsp;&rarr;')}
              <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:13.5px;line-height:1.6;color:#5C5C5C;margin:32px 0 0;">
                Three things worth doing first:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                <tr>
                  <td style="padding:14px 0;border-top:1px solid #EAEAE6;">
                    <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:10.5px;letter-spacing:0.06em;color:#8C8C8C;">01 / IMPORT</span><br>
                    <span style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:14px;color:#242424;">Upload your first dataset as CSV, JSON, or JSONL.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-top:1px solid #EAEAE6;">
                    <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:10.5px;letter-spacing:0.06em;color:#8C8C8C;">02 / INVITE</span><br>
                    <span style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:14px;color:#242424;">Bring evaluators into your workspace to start scoring.</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-top:1px solid #EAEAE6;border-bottom:1px solid #EAEAE6;">
                    <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:10.5px;letter-spacing:0.06em;color:#8C8C8C;">03 / EVALUATE</span><br>
                    <span style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:14px;color:#242424;">Run your first single, pairwise, or ranked evaluation.</span>
                  </td>
                </tr>
              </table>`,
    footerNote: `Need a hand getting started? Reply to this email or reach us at <a href="mailto:support@scorra.ai" style="color:#5C5C5C;text-decoration:underline;">support@scorra.ai</a>.`,
  });

  return { subject, text, html };
}
