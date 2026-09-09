import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthTokenPayload, UserRole } from '@scorra/types';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('organizations')
@ApiBearerAuth('JWT')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations for current user' })
  findAll(@CurrentUser() user: AuthTokenPayload) {
    return this.organizationsService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) {
    return this.organizationsService.findOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  create(@CurrentUser() user: AuthTokenPayload, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.sub, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update organization' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, user.sub, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List organization members' })
  getMembers(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) {
    return this.organizationsService.getMembers(id, user.sub);
  }

  @Patch(':id/members/:userId')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Change member role' })
  changeMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.organizationsService.changeMemberRole(id, targetUserId, user.sub, dto);
  }

  @Delete(':id/members/:userId')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Remove member from organization' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.organizationsService.removeMember(id, targetUserId, user.sub);
  }

  @Post(':id/invitations')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Invite a user to the organization' })
  invite(
    @Param('id') id: string,
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.invite(id, user.sub, dto);
  }

  @Get(':id/invitations')
  @ApiOperation({ summary: 'List pending invitations for the organization' })
  listInvitations(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload) {
    return this.organizationsService.listInvitations(id, user.sub);
  }

  @Post(':id/invitations/:invitationId/resend')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Resend a pending invitation with a fresh token and expiry' })
  resendInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.organizationsService.resendInvitation(id, invitationId, user.sub);
  }

  @Delete(':id/invitations/:invitationId')
  @Roles(UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revokeInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: AuthTokenPayload,
  ) {
    return this.organizationsService.revokeInvitation(id, invitationId, user.sub);
  }

  @Public()
  @Get('/invitations/:token')
  @ApiOperation({ summary: 'Get invitation details by token (public)' })
  getInvitation(@Param('token') token: string) {
    return this.organizationsService.getInvitationByToken(token);
  }

  @Post('/invitations/:token/accept')
  @ApiOperation({ summary: 'Accept an invitation (requires auth)' })
  acceptInvitation(@Param('token') token: string, @CurrentUser() user: AuthTokenPayload) {
    return this.organizationsService.acceptInvitation(token, user.sub);
  }
}
