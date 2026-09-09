import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestExportDto } from './dto/request-export.dto';
import { QueueName, ExportGenerationJobData } from '@scorra/types';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.EXPORT_GENERATION)
    private readonly exportQueue: Queue,
  ) {}

  async requestExport(organizationId: string, userId: string, dto: RequestExportDto) {
    const task = await this.prisma.evaluationTask.findFirst({
      where: { id: dto.taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const exportRecord = await this.prisma.export.create({
      data: {
        organizationId,
        taskId: dto.taskId,
        requestedById: userId,
        format: dto.format,
        status: 'PENDING',
        filters: (dto.filters ?? {}) as any,
      },
    });

    const jobData: ExportGenerationJobData = {
      exportId: exportRecord.id,
      taskId: dto.taskId,
      organizationId,
      format: dto.format,
      filters: dto.filters ?? {},
      requestedById: userId,
    };

    await this.exportQueue.add('generate-export', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });

    this.logger.log(`Export ${exportRecord.id} queued for generation`);
    return exportRecord;
  }

  async findAll(organizationId: string) {
    return this.prisma.export.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        task: { select: { id: true, name: true } },
      },
    });
  }
}
