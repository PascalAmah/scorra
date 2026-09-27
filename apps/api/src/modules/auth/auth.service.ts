import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokenPayload, QueueName, UserRole } from '@scorra/types';
import type {
  WelcomeEmailJobData,
  ResetPasswordEmailJobData,
} from '../queue/workers/email-notifications.worker';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly RESET_TOKEN_MINUTES = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectQueue(QueueName.EMAIL_NOTIFICATIONS)
    private readonly emailQueue: Queue,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          role: dto.organizationName ? UserRole.ORG_ADMIN : UserRole.EVALUATOR,
          status: 'ACTIVE',
        },
      });

      // Create organization if provided
      if (dto.organizationName) {
        const slug = this.generateSlug(dto.organizationName);
        const org = await tx.organization.create({
          data: {
            name: dto.organizationName,
            slug,
            plan: 'FREE',
          },
        });

        await tx.organizationMember.create({
          data: {
            userId: newUser.id,
            organizationId: org.id,
            role: UserRole.ORG_ADMIN,
          },
        });

        return { ...newUser, organizationId: org.id };
      }

      return { ...newUser, organizationId: null };
    });

    const tokens = await this.generateTokens(user);

    const welcomeJobData: WelcomeEmailJobData = {
      to: user.email,
      firstName: user.name.split(' ')[0] ?? user.name,
    };
    this.emailQueue
      .add('send-welcome', welcomeJobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      })
      .catch((err) => this.logger.warn(`Failed to queue welcome email: ${err.message}`));

    this.logger.log(`New user registered: ${user.email}`);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    const response = {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
    if (!user || user.status === 'INACTIVE') {
      return response;
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.RESET_TOKEN_MINUTES);

    const resetToken = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });

      return tx.passwordResetToken.create({
        data: {
          token: randomBytes(32).toString('hex'),
          userId: user.id,
          expiresAt,
        },
      });
    });

    const jobData: ResetPasswordEmailJobData = {
      to: user.email,
      firstName: user.name.split(' ')[0] ?? user.name,
      resetToken: resetToken.token,
      expiryMinutes: this.RESET_TOKEN_MINUTES,
    };
    this.emailQueue
      .add('send-reset-password', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      })
      .catch((err) => this.logger.warn(`Failed to queue reset email: ${err.message}`));

    this.logger.log(`Password reset requested for ${user.email}`);

    return response;
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired. Please request a new one.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${resetRecord.userId}`);
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Your account is inactive');
    }

    // Get organization membership
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: 'desc' },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const userWithOrg = {
      ...user,
      organizationId: membership?.organizationId ?? null,
      organizationRole: membership?.role,
    };
    const tokens = await this.generateTokens(userWithOrg);

    return {
      ...tokens,
      user: this.sanitizeUser(userWithOrg),
    };
  }

  async refreshTokens(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: tokenRecord.user.id },
      orderBy: { joinedAt: 'desc' },
    });

    const userWithOrg = {
      ...tokenRecord.user,
      organizationId: membership?.organizationId ?? null,
      organizationRole: membership?.role,
    };

    return this.generateTokens(userWithOrg);
  }

  async switchOrg(userId: string, targetOrgId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: targetOrgId },
    });

    if (!membership) {
      throw new UnauthorizedException('Not a member of this organization');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const userWithOrg = {
      ...user,
      organizationId: membership.organizationId,
      organizationRole: membership.role,
    };

    const tokens = await this.generateTokens(userWithOrg);

    return {
      ...tokens,
      user: this.sanitizeUser({
        ...user,
        organizationId: membership.organizationId,
        organizationRole: membership.role,
      }),
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  async validateJwtPayload(payload: AuthTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Verify org membership if org context is present in the token
    if (payload.organizationId) {
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id, organizationId: payload.organizationId },
      });
      if (!membership) {
        throw new UnauthorizedException('No longer a member of this organization');
      }
    }

    return user;
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    organizationId: string | null;
    organizationRole?: string;
  }) {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId,
      organizationRole: (user.organizationRole ?? user.role) as UserRole,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.generateRefreshToken(user.id),
    ]);

    return { accessToken, refreshToken };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    organizationId: string | null;
    organizationRole?: string;
    avatarUrl?: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      status: user.status,
      organizationId: user.organizationId,
      organizationRole: (user.organizationRole ?? user.role) as UserRole,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
