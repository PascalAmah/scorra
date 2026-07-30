import { IsString, IsArray, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitRankingDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  datasetRowId: string;

  @ApiProperty({ type: [{ responseId: 'string', rank: 0, score: 0 }] })
  @IsArray()
  entries: { responseId: string; rank: number; score?: number }[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpentSeconds?: number;
}
