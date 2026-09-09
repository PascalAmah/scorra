import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvaluationsService } from './evaluations.service';
import { EvaluationTasksService } from './evaluation-tasks.service';
import { AiService } from '../ai/ai.service';
import { CreateEvaluationTaskDto } from './dto/create-evaluation-task.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { UpdateEvaluationTaskDto } from './dto/update-evaluation-task.dto';
import { AutoLabelDto } from './dto/auto-label.dto';
import { TaskResultsQueryDto } from './dto/task-results-query.dto';
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
    private readonly aiService: AiService,
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
  listTasks(
    @CurrentOrgId() orgId: string,
    @Query() query: PaginationDto,
    @CurrentUser() user?: AuthTokenPayload,
  ) {
    return this.tasksService.findAll(orgId, query, user);
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
  getProgress(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
  ) {
    return this.tasksService.getProgress(taskId, orgId, user.sub);
  }

  @Get('tasks/:taskId/disagreement')
  @ApiOperation({ summary: 'Analyze evaluator disagreement on a task' })
  getDisagreement(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.evaluationsService.analyzeDisagreement(taskId, orgId);
  }

  @Get('tasks/:taskId/summary')
  @ApiOperation({ summary: 'Summarize evaluator feedback for a task' })
  getFeedbackSummary(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.evaluationsService.getFeedbackSummary(taskId, orgId);
  }

  @Post('auto-label')
  @ApiOperation({ summary: 'Auto-label an evaluation comment' })
  autoLabel(@Body() dto: AutoLabelDto) {
    return this.aiService.autoLabelComment(dto.comment);
  }

  // ── Evaluation workflow ────────────────────────────────────────────────

  @Get('tasks/:taskId/next')
  @Roles(UserRole.EVALUATOR)
  @ApiOperation({ summary: 'Get next item to evaluate in a task' })
  getNextItem(
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
  ) {
    return this.evaluationsService.getNextItem(taskId, user.sub, orgId);
  }

  @Post('submit')
  @Roles(UserRole.EVALUATOR)
  @ApiOperation({ summary: 'Submit an evaluation' })
  submit(
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
    @Body() dto: SubmitEvaluationDto,
  ) {
    return this.evaluationsService.submit(user.sub, dto, orgId);
  }

  @Patch('tasks/:taskId/pause')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Pause an active evaluation task' })
  pauseTask(@Param('taskId') taskId: string, @CurrentOrgId() orgId: string) {
    return this.tasksService.pause(taskId, orgId);
  }

  @Patch('tasks/:taskId')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an evaluation task' })
  updateTask(
    @Param('taskId') taskId: string,
    @CurrentOrgId() orgId: string,
    @Body() dto: UpdateEvaluationTaskDto,
  ) {
    return this.tasksService.update(taskId, orgId, dto);
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
    @Query() query: TaskResultsQueryDto,
  ) {
    return this.evaluationsService.findByTask(taskId, orgId, query);
  }

  @Get('my-evaluations')
  @ApiOperation({ summary: 'Get evaluations submitted by the current user' })
  getMyEvaluations(@CurrentUser() user: AuthTokenPayload, @Query() query: PaginationDto) {
    return this.evaluationsService.findByEvaluator(user.sub, query);
  }
}
