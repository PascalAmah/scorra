import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName } from '@scorra/types';
import { EmailService } from '../../../common/services/email';

export interface InvitationEmailJobData {
  to: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  invitationToken: string;
  expiresAt: string; // ISO string — Date is not serializable across Bull/Redis
}

export interface WelcomeEmailJobData {
  to: string;
  firstName: string;
}

export interface ResetPasswordEmailJobData {
  to: string;
  firstName: string;
  resetToken: string;
  expiryMinutes: number;
}

@Processor(QueueName.EMAIL_NOTIFICATIONS)
export class EmailNotificationsWorker {
  private readonly logger = new Logger(EmailNotificationsWorker.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('send-invitation')
  async handleSendInvitation(job: Job<InvitationEmailJobData>) {
    const { to, invitedByName, organizationName, role, invitationToken, expiresAt } = job.data;

    this.logger.log(`Sending invitation email to ${to} for org "${organizationName}"`);

    await this.emailService.sendInvitationEmail({
      to,
      invitedByName,
      organizationName,
      role,
      invitationToken,
      expiresAt: new Date(expiresAt),
    });
  }

  @Process('send-welcome')
  async handleSendWelcome(job: Job<WelcomeEmailJobData>) {
    const { to, firstName } = job.data;

    this.logger.log(`Sending welcome email to ${to}`);

    await this.emailService.sendWelcomeEmail({ to, firstName });
  }

  @Process('send-reset-password')
  async handleSendResetPassword(job: Job<ResetPasswordEmailJobData>) {
    const { to, firstName, resetToken, expiryMinutes } = job.data;

    this.logger.log(`Sending password reset email to ${to}`);

    await this.emailService.sendResetPasswordEmail({ to, firstName, resetToken, expiryMinutes });
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Email job ${job.id} (${job.name}) failed: ${error.message}`, error.stack);
  }
}
