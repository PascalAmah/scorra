import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QueueName } from '@scorra/types';
import { EmailService } from '../../../common/services/email.service';

export interface InvitationEmailJobData {
  to: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  invitationToken: string;
  expiresAt: string; // ISO string — Date is not serializable across Bull/Redis
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

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Email job ${job.id} (${job.name}) failed: ${error.message}`,
      error.stack,
    );
  }
}
