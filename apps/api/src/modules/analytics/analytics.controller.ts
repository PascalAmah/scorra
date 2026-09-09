import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@scorra/types';

@ApiTags('analytics')
@ApiBearerAuth('JWT')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Org-level analytics overview' })
  getDashboard(@CurrentOrgId() orgId: string) {
    return this.analyticsService.getDashboardSummary(orgId);
  }

  @Get('tasks/:taskId/agreement')
  @ApiOperation({ summary: 'Inter-rater agreement metrics for a task' })
  getTaskAgreement(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.analyticsService.getTaskAgreement(taskId, orgId);
  }

  @Get('tasks/:taskId/scores')
  @ApiOperation({ summary: 'Score distribution and dimension breakdown for a task' })
  getTaskScores(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.analyticsService.getTaskScores(taskId, orgId);
  }

  @Get('evaluators')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Evaluator throughput and consistency metrics' })
  getEvaluatorMetrics(@CurrentOrgId() orgId: string) {
    return this.analyticsService.getEvaluatorMetrics(orgId);
  }
}
