import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExportsService } from './exports.service';
import { RequestExportDto } from './dto/request-export.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { AuthTokenPayload } from '@scorra/types';

@ApiTags('exports')
@ApiBearerAuth('JWT')
@Controller({ path: 'exports', version: '1' })
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

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
  @ApiOperation({ summary: 'Get download URL for a ready export' })
  getDownloadUrl(@Param('id') id: string, @CurrentOrgId() orgId: string) {
    return this.exportsService.getDownloadUrl(id, orgId);
  }
}
