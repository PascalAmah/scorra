import { IsString, IsArray, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RankingEntryDto {
  @ApiProperty()
  @IsString()
  responseId: string;

  @ApiProperty()
  @IsInt()
  rank: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  score?: number;
}

export class SubmitRankingDto {
  @ApiProperty()
  @IsString()
  taskId: string;

  @ApiProperty()
  @IsString()
  datasetRowId: string;

  @ApiProperty({ type: () => [RankingEntryDto] })
  @IsArray()
  entries: RankingEntryDto[];

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
