import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AutoLabelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comment: string;
}
