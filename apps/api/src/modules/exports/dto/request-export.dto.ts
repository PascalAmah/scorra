import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExportFormat {
  JSON = 'JSON',
  CSV = 'CSV',
  JSONL = 'JSONL',
}

export class RequestExportDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty({ enum: ExportFormat })
  @IsIn(Object.values(ExportFormat))
  format: ExportFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}
