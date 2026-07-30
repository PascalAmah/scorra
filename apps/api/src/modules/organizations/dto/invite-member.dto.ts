import { IsString, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@scorra/types';

export class InviteMemberDto {
  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EVALUATOR })
  @IsEnum(UserRole)
  role: UserRole;
}
