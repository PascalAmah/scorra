import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComparisonsService } from './comparisons.service';
import { SubmitComparisonDto } from './dto/submit-comparison.dto';
import { SubmitRankingDto } from './dto/submit-ranking.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@scorra/types';

@ApiTags('comparisons')
@ApiBearerAuth('JWT')
@Controller({ path: 'comparisons', version: '1' })
export class ComparisonsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @Get(':taskId/next')
  @ApiOperation({ summary: 'Get next uncompared pair for a pairwise task' })
  getNextPair(@Param('taskId') taskId: string, @CurrentUser() user: AuthTokenPayload) {
    return this.comparisonsService.getNextPair(taskId, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a pairwise comparison verdict' })
  submit(@CurrentUser() user: AuthTokenPayload, @Body() dto: SubmitComparisonDto) {
    return this.comparisonsService.submit(dto, user.sub);
  }

  @Get(':taskId/results')
  @ApiOperation({ summary: 'Get aggregated comparison results' })
  getResults(@Param('taskId') taskId: string, @CurrentUser() user: AuthTokenPayload) {
    return this.comparisonsService.getResults(taskId, user.sub);
  }
}

@ApiTags('rankings')
@ApiBearerAuth('JWT')
@Controller({ path: 'rankings', version: '1' })
export class RankingsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @Get(':taskId/next')
  @ApiOperation({ summary: 'Get next unranked set for a ranking task' })
  getNextRanking(@Param('taskId') taskId: string, @CurrentUser() user: AuthTokenPayload) {
    return this.comparisonsService.getNextRanking(taskId, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a ranking' })
  submitRanking(@CurrentUser() user: AuthTokenPayload, @Body() dto: SubmitRankingDto) {
    return this.comparisonsService.submitRanking(dto, user.sub);
  }
}
