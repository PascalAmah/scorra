import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueName } from '@scorra/types';
import { EmailModule } from '../../common/services/email';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.EMAIL_NOTIFICATIONS }), EmailModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
