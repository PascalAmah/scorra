import { IsString, IsEnum, IsOptional, IsArray, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComparisonVerdict } from '@scorra/types';

export class DimensionVerdictDto {
  @ApiProperty()
  @IsString()
  dimension: string;

  @ApiProperty({ enum: ComparisonVerdict })
  @IsEnum(ComparisonVerdict)
  verdict: ComparisonVerdict;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

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

  @ApiPropertyOptional({ type: () => [DimensionVerdictDto] })
  @IsOptional()
  @IsArray()
  dimensionVerdicts?: DimensionVerdictDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;
}
