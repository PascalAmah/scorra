import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { EvaluationTasksService } from './evaluation-tasks.service';
import { CreateEvaluationTaskDto } from './dto/create-evaluation-task.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthTokenPayload, UserRole } from '@scorra/types';

@ApiTags('evaluations')
@ApiBearerAuth('JWT')
@Controller({ path: 'evaluations', version: '1' })
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
    private readonly tasksService: EvaluationTasksService,
  ) {}

  // ── Tasks ──────────────────────────────────────────────────────────────

  @Post('tasks')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an evaluation task' })
  createTask(
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateEvaluationTaskDto,
  ) {
    return this.tasksService.create(orgId, user.sub, dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List evaluation tasks' })
  listTasks(@CurrentOrgId() orgId: string, @Query() query: PaginationDto) {
    return this.tasksService.findAll(orgId, query);
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get a task by ID' })
  getTask(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.tasksService.findOne(taskId, orgId);
  }

  @Patch('tasks/:taskId/activate')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate an evaluation task' })
  activateTask(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.tasksService.activate(taskId, orgId);
  }

  @Get('tasks/:taskId/progress')
  @ApiOperation({ summary: 'Get task completion progress' })
  getProgress(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.tasksService.getProgress(taskId, orgId);
  }

  // ── Evaluation workflow ────────────────────────────────────────────────

  @Get('tasks/:taskId/next')
  @ApiOperation({ summary: 'Get next item to evaluate in a task' })
  getNextItem(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
  ) {
    return this.evaluationsService.getNextItem(taskId, user.sub, orgId);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit an evaluation' })
  submit(@CurrentUser() user: AuthTokenPayload, @Body() dto: SubmitEvaluationDto) {
    return this.evaluationsService.submit(user.sub, dto);
  }

  @Post(':evaluationId/ai-suggestions')
  @ApiOperation({ summary: 'Request AI suggestions for an evaluation' })
  requestAISuggestions(
    @Param('evaluationId') evaluationId: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.evaluationsService.requestAISuggestions(evaluationId, user.sub);
  }

  @Get('tasks/:taskId/results')
  @ApiOperation({ summary: 'Get all evaluations for a task' })
  getTaskResults(
    @Param('taskId') taskId: string,
    @CurrentOrgId() orgId: string,
    @Query() query: PaginationDto,
  ) {
    return this.evaluationsService.findByTask(taskId, orgId, query);
  }

  @Get('my-evaluations')
  @ApiOperation({ summary: 'Get evaluations submitted by the current user' })
  getMyEvaluations(@CurrentUser() user: AuthTokenPayload, @Query() query: PaginationDto) {
    return this.evaluationsService.findByEvaluator(user.sub, query);
  }
}
