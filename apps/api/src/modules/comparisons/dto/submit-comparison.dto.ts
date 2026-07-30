import { IsString, IsEnum, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComparisonVerdict } from '@scorra/types';

export class SubmitComparisonDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  datasetRowId: string;

  @ApiProperty()
  @IsString()
  responseAId: string;

  @ApiProperty()
  @IsString()
  responseBId: string;

  @ApiProperty({ enum: ComparisonVerdict })
  @IsEnum(ComparisonVerdict)
  verdict: ComparisonVerdict;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reasoning?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  dimensionVerdicts?: { dimension: string; verdict: ComparisonVerdict; note?: string }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;
}
