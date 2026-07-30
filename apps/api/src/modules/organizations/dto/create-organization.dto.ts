import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationPlan } from '@scorra/types';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'acme-corp' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ enum: OrganizationPlan, default: OrganizationPlan.FREE })
  @IsOptional()
  @IsEnum(OrganizationPlan)
  plan?: OrganizationPlan;
}
