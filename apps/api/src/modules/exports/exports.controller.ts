import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { ExportGenerationService } from './export-generation.service';
import { RequestExportDto } from './dto/request-export.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { AuthTokenPayload } from '@scorra/types';

@ApiTags('exports')
@ApiBearerAuth('JWT')
@Controller({ path: 'exports', version: '1' })
export class ExportsController {
  constructor(
    private readonly exportsService: ExportsService,
    private readonly generationService: ExportGenerationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Request a new export' })
  requestExport(
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
    @Body() dto: RequestExportDto,
  ) {
    return this.exportsService.requestExport(orgId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List exports for current organization' })
  findAll(@CurrentOrgId() orgId: string) {
    return this.exportsService.findAll(orgId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a ready export file' })
  async download(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.generationService.getExportFile(id, orgId);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', String(file.buffer.length));
    return file.buffer;
  }
}