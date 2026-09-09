import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ManageUserDto } from './dto/manage-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrgId } from '../../common/decorators/current-org.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthTokenPayload, UserRole } from '@scorra/types';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: AuthTokenPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(@CurrentUser() user: AuthTokenPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users in current organization' })
  listUsers(@CurrentUser() user: AuthTokenPayload, @CurrentOrgId() orgId: string) {
    return this.usersService.listOrgUsers(orgId, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manage user (suspend/activate)' })
  manageUser(@Param('id') id: string, @Body() dto: ManageUserDto) {
    return this.usersService.manageUser(id, dto);
  }
}
