import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScoreDimension } from '@scorra/types';

export class EvaluationScoreDto {
  @ApiProperty({ enum: ScoreDimension })
  @IsEnum(ScoreDimension)
  dimension: ScoreDimension;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(10)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SubmitEvaluationDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  datasetRowId: string;

  @ApiProperty({ type: [EvaluationScoreDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationScoreDto)
  scores: EvaluationScoreDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  overallScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;
}
