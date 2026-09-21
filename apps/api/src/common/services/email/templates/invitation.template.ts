import { layout, CTA_BUTTON_HTML, escapeHtml } from './layout';

export interface InvitationEmailData {
  invitedByName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export function renderInvitationEmail(data: InvitationEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const { invitedByName, organizationName, role, inviteUrl, expiresAt } = data;

  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `You've been invited to evaluate on Scorra`;

  const text = [
    `Hi there,`,
    ``,
    `${invitedByName} wants your judgment.`,
    ``,
    `You've been invited to join ${organizationName} on Scorra as ${role === 'ORG_ADMIN' ? 'an admin' : 'an evaluator'}. You'll score AI responses — single ratings, side-by-side comparisons, or rankings — that feed directly into the team's quality metrics.`,
    ``,
    `Accept your invitation here:`,
    `${inviteUrl}`,
    ``,
    `This invitation expires on ${expiryDate}. No experience with AI evaluation needed — the rubric and task instructions are built into each task.`,
    ``,
    `— The Scorra Team`,
  ].join('\n');

  const html = layout({
    preheader: `${escapeHtml(invitedByName)} invited you to evaluate AI responses on Scorra.`,
    eyebrow: 'INVITATION',
    title: `${escapeHtml(invitedByName)} wants your judgment`,
    bodyHtml: `
              <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:15px;line-height:1.65;color:#333333;margin:0 0 24px;">
                You've been invited to join <b style="color:#0A0A0A;">${escapeHtml(organizationName)}</b> on Scorra as an evaluator. You'll score AI responses &mdash; single ratings, side-by-side comparisons, or rankings &mdash; that feed directly into the team's quality metrics.
              </p>
              <!-- task preview panel -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;border-radius:10px;margin-bottom:26px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="font-family:'Sora',Arial,sans-serif;font-weight:600;font-size:13.5px;color:#FFFFFF;">Sample evaluation task</span><br>
                          <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:10.5px;color:#8C8C8C;">Pairwise &middot; Response A vs. Response B</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
                      <tr>
                        <td width="50%" style="background-color:#141414;border:1px solid #333333;border-radius:8px;padding:12px 14px;">
                          <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:#8C8C8C;">Response A</span><br>
                          <span style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11.5px;color:#D8D8D4;">&hellip;</span>
                        </td>
                        <td width="14"></td>
                        <td width="50%" style="background-color:#141414;border:1px solid #FFFFFF;border-radius:8px;padding:12px 14px;">
                          <span style="font-family:'IBM Plex Mono',Courier,monospace;font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;color:#8C8C8C;">Response B</span><br>
                          <span style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:11.5px;color:#D8D8D4;">&hellip;</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${CTA_BUTTON_HTML(inviteUrl, 'Accept invitation &nbsp;&rarr;')}
              <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:12.5px;line-height:1.6;color:#8C8C8C;margin:20px 0 0;">
                This invitation expires on ${expiryDate}. No experience with AI evaluation needed &mdash; the rubric and task instructions are built into each task.
              </p>`,
    footerNote: `Questions about this invite? Reach the workspace owner or <a href="mailto:pascalamaliri@gmail.com" style="color:#5C5C5C;text-decoration:underline;">support@scorra.ai</a>.`,
  });

  return { subject, text, html };
}
