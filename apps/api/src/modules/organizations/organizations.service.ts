import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { ChangeMemberRoleDto } from './dto/change-member-role.dto';
import { UserRole } from '@scorra/types';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.organization.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { members: true, datasets: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, members: { some: { userId } } },
      include: { _count: { select: { members: true, datasets: true, tasks: true } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug ?? this.generateSlug(dto.name);

    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Organization with this slug already exists');

    const org = await this.prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
          plan: dto.plan ?? 'FREE',
        },
      });

      await tx.organizationMember.create({
        data: { userId, organizationId: newOrg.id, role: 'ORG_ADMIN' },
      });

      return newOrg;
    });

    this.logger.log(`Organization created: ${org.name} (${org.slug}) by user ${userId}`);
    return org;
  }

  async update(id: string, userId: string, dto: UpdateOrganizationDto) {
    await this.ensureOrgAdmin(id, userId);

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.settings !== undefined && { settings: dto.settings as any }),
      },
    });
  }

  async getMembers(id: string, userId: string) {
    await this.ensureMember(id, userId);

    return this.prisma.organizationMember.findMany({
      where: { organizationId: id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, status: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async changeMemberRole(orgId: string, targetUserId: string, userId: string, dto: ChangeMemberRoleDto) {
    await this.ensureOrgAdmin(orgId, userId);

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.organizationMember.update({
      where: { id: member.id },
      data: { role: dto.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async removeMember(orgId: string, targetUserId: string, userId: string) {
    await this.ensureOrgAdmin(orgId, userId);

    if (targetUserId === userId) {
      throw new ForbiddenException('Cannot remove yourself. Use leave organization instead.');
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.organizationMember.delete({ where: { id: member.id } });
    this.logger.log(`Member ${targetUserId} removed from org ${orgId}`);

    return { message: 'Member removed' };
  }

  async invite(orgId: string, userId: string, dto: InviteMemberDto) {
    await this.ensureOrgAdmin(orgId, userId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email.toLowerCase(),
        organizationId: orgId,
        role: dto.role,
        expiresAt,
        createdById: userId,
      },
    });

    this.logger.log(`Invitation sent to ${dto.email} for org ${orgId}`);
    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.expiresAt < new Date()) throw new ForbiddenException('Invitation has expired');
    if (invitation.acceptedAt) throw new ConflictException('Invitation already accepted');

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: invitation.organizationId },
    });
    if (existingMember) throw new ConflictException('Already a member of this organization');

    await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    this.logger.log(`User ${userId} accepted invitation to org ${invitation.organizationId}`);
    return { message: 'Invitation accepted', organizationId: invitation.organizationId };
  }

  private async ensureOrgAdmin(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!member || (member.role !== 'ORG_ADMIN' && member.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only organization admins can perform this action');
    }
  }

  private async ensureMember(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
    });
    if (!member) throw new ForbiddenException('Not a member of this organization');
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
