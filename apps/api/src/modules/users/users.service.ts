import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ManageUserDto } from './dto/manage-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, status: true, avatarUrl: true, lastLoginAt: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: { id: true, email: true, name: true, role: true, status: true, avatarUrl: true, createdAt: true },
    });
  }

  async listOrgUsers(organizationId: string, userId: string) {
    // Verify requester is a member
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
    });
    if (!member || (member.role !== 'ORG_ADMIN' && member.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only org admins can list users');
    }

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true, role: true, status: true, avatarUrl: true, lastLoginAt: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async manageUser(targetUserId: string, dto: ManageUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: dto.status },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    this.logger.log(`User ${targetUserId} status changed to ${dto.status}`);
    return updated;
  }
}
