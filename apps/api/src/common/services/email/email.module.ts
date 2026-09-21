import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Standalone module so both the queue workers and the auth module
 * can inject EmailService without coupling to the whole QueueModule.
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
