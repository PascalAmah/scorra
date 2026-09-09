import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendInvitationEmailOptions {
  to: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  invitationToken: string;
  expiresAt: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('app.smtpHost');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('app.smtpPort') ?? 587,
        secure: (this.config.get<number>('app.smtpPort') ?? 587) === 465,
        auth: {
          user: this.config.get<string>('app.smtpUser'),
          pass: this.config.get<string>('app.smtpPass'),
        },
      });
    } else {
      this.logger.warn(
        'SMTP_HOST is not configured — invitation emails will be logged only. ' +
          'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to enable delivery.',
      );
    }
  }

  async sendInvitationEmail(options: SendInvitationEmailOptions): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
    const acceptUrl = `${frontendUrl}/accept-invitation?token=${options.invitationToken}`;
    const from = this.config.get<string>('app.smtpFrom') ?? 'noreply@scorra.dev';

    const subject = `You've been invited to join ${options.organizationName} on Scorra`;

    const text = [
      `Hi there,`,
      ``,
      `${options.invitedByName} has invited you to join ${options.organizationName} on Scorra as a ${options.role}.`,
      ``,
      `Accept your invitation here:`,
      `${acceptUrl}`,
      ``,
      `This invitation expires on ${options.expiresAt.toDateString()}.`,
      ``,
      `If you weren't expecting this invitation, you can safely ignore this email.`,
      ``,
      `— The Scorra Team`,
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${subject}</title></head>
<body style="font-family: sans-serif; background:#f9fafb; margin:0; padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb; padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff; border-radius:8px; padding:40px; border:1px solid #e5e7eb;">
        <tr><td>
          <h2 style="color:#111827; margin:0 0 16px;">You've been invited to Scorra</h2>
          <p style="color:#374151; line-height:1.6;">
            <strong>${options.invitedByName}</strong> has invited you to join
            <strong>${options.organizationName}</strong> as a <strong>${options.role}</strong>.
          </p>
          <div style="margin:32px 0; text-align:center;">
            <a href="${acceptUrl}"
               style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none;
                      padding:12px 32px; border-radius:6px; font-weight:600; font-size:15px;">
              Accept Invitation
            </a>
          </div>
          <p style="color:#6b7280; font-size:13px;">
            This invitation expires on <strong>${options.expiresAt.toDateString()}</strong>.
            If you weren't expecting this, you can safely ignore this email.
          </p>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
          <p style="color:#9ca3af; font-size:12px; text-align:center;">
            Sent by Scorra &mdash; AI Evaluation Platform
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    if (!this.transporter) {
      // No SMTP configured — log the invite URL so developers can use it locally.
      this.logger.log(
        `[EMAIL – no SMTP] Invitation to ${options.to} | Accept: ${acceptUrl}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from, to: options.to, subject, text, html });
      this.logger.log(`Invitation email sent to ${options.to}`);
    } catch (err) {
      // Never let email failure break the invite flow — log and move on.
      this.logger.error(
        `Failed to send invitation email to ${options.to}: ${(err as Error).message}`,
      );
    }
  }
}
