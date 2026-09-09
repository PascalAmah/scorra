import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  MinLength,
  MaxLength,
  ValidateNested,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationType, ScoreDimension } from '@scorra/types';

export class ScoringCriteriaDto {
  @ApiProperty({ enum: ScoreDimension })
  @IsEnum(ScoreDimension)
  dimension: ScoreDimension;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ default: 1 })
  @IsNumber()
  @Min(0)
  minScore: number;

  @ApiProperty({ default: 5 })
  @IsNumber()
  @Min(1)
  maxScore: number;

  @ApiProperty({ default: 1.0 })
  @IsNumber()
  @Min(0)
  @Max(10)
  weight: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  required: boolean;
}

export class CreateEvaluationTaskDto {
  @ApiProperty()
  @IsString()
  datasetId: string;

  @ApiProperty({ example: 'GPT-4 vs Claude 3 — Customer Support' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: EvaluationType, default: EvaluationType.SINGLE })
  @IsOptional()
  @IsEnum(EvaluationType)
  type?: EvaluationType;

  @ApiPropertyOptional({ type: [ScoringCriteriaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoringCriteriaDto)
  scoringCriteria?: ScoringCriteriaDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evaluatorIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
