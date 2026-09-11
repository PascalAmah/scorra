import { layout, CTA_BUTTON_HTML, escapeHtml, PARAGRAPH_HTML } from './layout';

export interface ResetPasswordEmailData {
  email: string;
  firstName: string;
  resetUrl: string;
  expiryMinutes: number;
}

export function renderResetPasswordEmail(data: ResetPasswordEmailData): {
  subject: string;
  text: string;
  html: string;
} {
  const { email, firstName, resetUrl, expiryMinutes } = data;

  const subject = 'Reset your Scorra password';

  const text = [
    `Hi ${firstName},`,
    ``,
    `We received a request to reset the password on your Scorra account (${email}). Click below to choose a new one. This link expires in ${expiryMinutes} minutes.`,
    ``,
    `Reset your password:`,
    `${resetUrl}`,
    ``,
    `Didn't request this? You can safely ignore this email — your password won't change unless you click the link and set a new one.`,
    ``,
    `— The Scorra Team`,
  ].join('\n');

  const html = layout({
    preheader: `Reset your password. This link expires in ${expiryMinutes} minutes.`,
    eyebrow: 'SECURITY',
    title: 'Reset your password',
    bodyHtml: `
              ${PARAGRAPH_HTML(
                `Hi ${escapeHtml(firstName)}, we received a request to reset the password on your Scorra account (<span style="color:#0A0A0A;font-weight:500;">${escapeHtml(email)}</span>). Click below to choose a new one. This link expires in <b>${expiryMinutes} minutes</b>.`,
              )}
              ${CTA_BUTTON_HTML(resetUrl, 'Reset password')}
              <p style="font-family:'IBM Plex Mono',Courier,monospace;font-size:11.5px;color:#8C8C8C;line-height:1.6;margin:26px 0 0;word-break:break-all;">
                Or paste this link into your browser:<br>
                <span style="color:#5C5C5C;">${resetUrl}</span>
              </p>
              <div style="margin-top:30px;padding-top:20px;border-top:1px solid #EAEAE6;">
                <p style="font-family:'IBM Plex Sans',Arial,sans-serif;font-size:13px;line-height:1.6;color:#8C8C8C;margin:0;">
                  Didn't request this? You can safely ignore this email &mdash; your password won't change unless you click the link above and set a new one.
                </p>
              </div>`,
    footerNote: `Concerned about account security? Contact us at <a href="mailto:pascalamaliri@gmail.com" style="color:#5C5C5C;text-decoration:underline;">support@scorra.ai</a>.`,
  });

  return { subject, text, html };
}
