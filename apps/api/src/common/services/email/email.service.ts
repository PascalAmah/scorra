import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderWelcomeEmail, renderResetPasswordEmail, renderInvitationEmail } from './templates';

// ─────────────────────────────────────────────────────────────
// Option types
// ─────────────────────────────────────────────────────────────

export interface SendWelcomeEmailOptions {
  to: string;
  firstName: string;
}

export interface SendResetPasswordEmailOptions {
  to: string;
  firstName: string;
  resetToken: string;
  expiryMinutes: number;
}

export interface SendInvitationEmailOptions {
  to: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  invitationToken: string;
  expiresAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Sendlib REST API types — https://sendlib.samueltuoyo.com
// ─────────────────────────────────────────────────────────────

interface SendlibSendPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string; // base64-encoded
    type?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl =
      this.config.get<string>('app.sendlibApiUrl') ?? 'https://sendlib.samueltuoyo.com/api/send';
    this.apiKey = this.config.get<string>('app.sendlibApiKey') || undefined;
    this.from = this.config.get<string>('app.sendlibFrom') ?? 'Scorra <noreply@scorra.dev>';

    if (!this.apiKey) {
      this.logger.warn(
        'SENDLIB_API_KEY is not configured — emails will be logged only. ' +
          'Set SENDLIB_API_KEY (and SENDLIB_FROM) to enable delivery via the Sendlib REST API.',
      );
    }
  }

  // ────────────────────────────────────────────────────────────
  // Welcome — sent on sign-up
  // ────────────────────────────────────────────────────────────

  async sendWelcomeEmail(options: SendWelcomeEmailOptions): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

    const { subject, text, html } = renderWelcomeEmail({
      firstName: options.firstName,
      workspaceUrl: `${frontendUrl}/dashboard`,
    });

    await this.send(options.to, subject, text, html, `Welcome | ${options.to}`);
  }

  // ────────────────────────────────────────────────────────────
  // Reset password — sent from the "Forgot password" flow
  // ────────────────────────────────────────────────────────────

  async sendResetPasswordEmail(options: SendResetPasswordEmailOptions): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

    const { subject, text, html } = renderResetPasswordEmail({
      email: options.to,
      firstName: options.firstName,
      resetUrl: `${frontendUrl}/reset-password?token=${options.resetToken}`,
      expiryMinutes: options.expiryMinutes,
    });

    await this.send(options.to, subject, text, html, `Password reset | ${options.to}`);
  }

  // ────────────────────────────────────────────────────────────
  // Invitation — sent when a user invites someone to a workspace
  // ────────────────────────────────────────────────────────────

  async sendInvitationEmail(options: SendInvitationEmailOptions): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';

    const { subject, text, html } = renderInvitationEmail({
      invitedByName: options.invitedByName,
      organizationName: options.organizationName,
      role: options.role,
      inviteUrl: `${frontendUrl}/accept-invitation?token=${options.invitationToken}`,
      expiresAt: options.expiresAt,
    });

    await this.send(options.to, subject, text, html, `Invitation | ${options.to}`);
  }

  // ────────────────────────────────────────────────────────────
  // Delivery — Sendlib REST API (POST /api/send)
  // ────────────────────────────────────────────────────────────

  private async send(
    to: string,
    subject: string,
    text: string,
    html: string,
    logLabel: string,
  ): Promise<void> {
    if (!this.apiKey) {
      const match = html.match(/href="(https?:\/\/[^"]+)"/);
      this.logger.log(`[EMAIL – no SENDLIB_API_KEY] ${logLabel} | Link: ${match?.[1] ?? 'n/a'}`);
      return;
    }

    const payload: SendlibSendPayload = { from: this.from, to, subject, html, text };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Sendlib responded ${response.status}: ${body.slice(0, 500)}`);
      }

      this.logger.log(`Email sent: ${logLabel}`);
    } catch (err) {
      this.logger.error(`Failed to send email (${logLabel}): ${(err as Error).message}`);
      throw err;
    }
  }
}
