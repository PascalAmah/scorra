import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromptType } from '@scorra/types';

export class CreatePromptDto {
  @ApiProperty()
  @IsString()
  datasetId: string;

  @ApiProperty({ example: 'Summarize the following article in 3 sentences.' })
  @IsString()
  @MinLength(1)
  prompt: string;

  @ApiPropertyOptional({ enum: PromptType, default: PromptType.COMPLETION })
  @IsOptional()
  @IsEnum(PromptType)
  promptType?: PromptType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expectedOutput?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
