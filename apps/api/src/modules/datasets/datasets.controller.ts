import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DatasetsService } from './datasets.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthTokenPayload, UserRole } from '@scorra/types';

class DatasetFileValidator extends FileValidator {
  constructor() {
    super({});
  }
  isValid(file: Express.Multer.File): boolean {
    return /\.(csv|json|jsonl|txt)$/i.test(file.originalname ?? '');
  }
  buildErrorMessage(file: Express.Multer.File): string {
    return `Unsupported file type. Expected a .csv, .json, .jsonl, or .txt file (got "${file.originalname}").`;
  }
}

@ApiTags('datasets')
@ApiBearerAuth('JWT')
@Controller({ path: 'datasets', version: '1' })
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new dataset' })
  create(
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
    @Body() dto: CreateDatasetDto,
  ) {
    return this.datasetsService.create(orgId, user.sub, dto);
  }

  @Post(':id/upload')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload a file to a dataset' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new DatasetFileValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.datasetsService.uploadFile(id, orgId, user.sub, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all datasets for the organization' })
  findAll(@CurrentOrgId() orgId: string, @Query() query: PaginationDto) {
    return this.datasetsService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dataset by ID' })
  findOne(@Param('id') id: string, @CurrentOrgId() orgId: string) {
    return this.datasetsService.findOne(id, orgId);
  }

  @Get(':id/rows')
  @ApiOperation({ summary: 'Get rows for a dataset' })
  getRows(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string,
    @Query() query: PaginationDto,
  ) {
    return this.datasetsService.getRows(id, orgId, query);
  }

  @Get(':id/rows/:rowId')
  @ApiOperation({ summary: 'Get a single dataset row with its model responses' })
  getRow(
    @Param('id') id: string,
    @Param('rowId') rowId: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.datasetsService.getRow(id, rowId, orgId);
  }

  @Post('prompts')
  @ApiOperation({ summary: 'Add a prompt/row to a dataset' })
  createPrompt(
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
    @Body() dto: CreatePromptDto,
  ) {
    return this.datasetsService.createPrompt(orgId, user.sub, dto);
  }

  @Patch(':id/archive')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Archive a dataset' })
  archive(@Param('id') id: string, @CurrentOrgId() orgId: string) {
    return this.datasetsService.archive(id, orgId);
  }

  @Delete(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a dataset' })
  delete(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.datasetsService.delete(id, orgId, user.sub);
  }

  @Put(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update dataset metadata' })
  update(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string,
    @Body() dto: UpdateDatasetDto,
  ) {
    return this.datasetsService.update(id, orgId, dto);
  }

  @Post(':id/generate-responses')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate AI responses for dataset rows missing them' })
  generateResponses(
    @Param('id') id: string,
    @CurrentUser() user: AuthTokenPayload,
    @CurrentOrgId() orgId: string,
  ) {
    return this.datasetsService.generateResponses(id, orgId, user.sub);
  }

  @Post(':id/clone')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Clone a dataset' })
  clone(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUser() user: AuthTokenPayload,
    @Body('name') newName?: string,
  ) {
    return this.datasetsService.clone(id, orgId, user.sub, newName);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history for a dataset' })
  getVersions(@Param('id') id: string, @CurrentOrgId() orgId: string) {
    return this.datasetsService.getVersions(id, orgId);
  }

  @Get(':id/versions/diff')
  @ApiOperation({ summary: 'Get a row-level diff between two dataset versions' })
  getVersionDiff(
    @Param('id') id: string,
    @CurrentOrgId() orgId: string,
    @Query('baseVersion') baseVersion: string,
    @Query('currentVersion') currentVersion: string,
  ) {
    return this.datasetsService.getVersionDiff(
      id,
      orgId,
      Number(baseVersion),
      Number(currentVersion),
    );
  }
}
