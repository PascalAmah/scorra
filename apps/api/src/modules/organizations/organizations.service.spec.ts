import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { UserRole, QueueName } from '@scorra/types';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: any;

  const userId = 'user-1';
  const orgId = 'org-1';
  const mockOrg = { id: orgId, name: 'Test Org', slug: 'test-org', plan: 'FREE', logoUrl: null, settings: {}, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(async () => {
    prisma = {
      organization: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      invitation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: getQueueToken(QueueName.EMAIL_NOTIFICATIONS),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('create', () => {
    it('should create an org and add creator as admin', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          organization: { create: jest.fn().mockResolvedValue(mockOrg) },
          organizationMember: { create: jest.fn() },
        };
        return cb(tx);
      });

      const result = await service.create(userId, { name: 'Test Org' });
      expect(result).toEqual(mockOrg);
    });

    it('should throw if slug already exists', async () => {
      prisma.organization.findUnique.mockResolvedValue(mockOrg);
      await expect(service.create(userId, { name: 'Test Org', slug: 'test-org' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return orgs where user is a member', async () => {
      prisma.organization.findMany.mockResolvedValue([mockOrg]);
      const result = await service.findAll(userId);
      expect(result).toEqual([mockOrg]);
    });
  });

  describe('findOne', () => {
    it('should return org if user is member', async () => {
      prisma.organization.findFirst.mockResolvedValue(mockOrg);
      const result = await service.findOne(orgId, userId);
      expect(result).toEqual(mockOrg);
    });

    it('should throw if not found', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);
      await expect(service.findOne(orgId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('members', () => {
    it('should list members', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ role: 'EVALUATOR' });
      prisma.organizationMember.findMany.mockResolvedValue([]);
      const result = await service.getMembers(orgId, userId);
      expect(result).toEqual([]);
    });

    it('should change member role', async () => {
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ role: UserRole.ORG_ADMIN })
        .mockResolvedValueOnce({ id: 'm-1', role: UserRole.EVALUATOR });
      prisma.organizationMember.update.mockResolvedValue({ id: 'm-1', role: UserRole.ORG_ADMIN, user: { id: 'target', name: 'T', email: 't@t.com' } });
      const result = await service.changeMemberRole(orgId, 'target', userId, { role: UserRole.ORG_ADMIN });
      expect(result.role).toBe(UserRole.ORG_ADMIN);
    });

    it('should throw if not org admin', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ role: UserRole.EVALUATOR });
      await expect(service.changeMemberRole(orgId, 'target', userId, { role: UserRole.ORG_ADMIN })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('invitations', () => {
    it('should create invitation', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ role: UserRole.ORG_ADMIN });
      prisma.organization.findUnique.mockResolvedValue({ name: 'Test Org' });
      prisma.user.findUnique.mockResolvedValue({ name: 'Inviter' });
      prisma.invitation.create.mockResolvedValue({ id: 'inv-1', email: 'new@test.com', organizationId: orgId, role: UserRole.EVALUATOR });
      const result = await service.invite(orgId, userId, { email: 'new@test.com', role: UserRole.EVALUATOR });
      expect(result.email).toBe('new@test.com');
    });

    it('should accept invitation when the signed-in email matches', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1', token: 'tok', email: 'me@test.com', organizationId: orgId, role: 'EVALUATOR',
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ email: 'me@test.com' });
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([]);
      const result = await service.acceptInvitation('tok', userId);
      expect(result.organizationId).toBe(orgId);
    });

    it('should reject acceptance when the invitation is bound to a different email', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1', token: 'tok', email: 'other@test.com', organizationId: orgId, role: UserRole.ORG_ADMIN,
        expiresAt: new Date(Date.now() + 86400000), acceptedAt: null,
      });
      prisma.user.findUnique.mockResolvedValue({ email: 'me@test.com' });
      await expect(service.acceptInvitation('tok', userId)).rejects.toThrow(ForbiddenException);
      // The membership must never be created on a mismatched email.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listInvitations', () => {
    it('should list pending invitations for an org admin', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ role: UserRole.ORG_ADMIN });
      prisma.invitation.findMany.mockResolvedValue([{ id: 'inv-1', email: 'a@b.com' }]);
      const result = await service.listInvitations(orgId, userId);
      expect(result).toEqual([{ id: 'inv-1', email: 'a@b.com' }]);
    });

    it('should forbid a non-admin member from listing invitations', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ role: UserRole.EVALUATOR });
      await expect(service.listInvitations(orgId, userId)).rejects.toThrow(ForbiddenException);
      expect(prisma.invitation.findMany).not.toHaveBeenCalled();
    });

    it('should forbid a non-member from listing invitations', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.listInvitations(orgId, userId)).rejects.toThrow(ForbiddenException);
      expect(prisma.invitation.findMany).not.toHaveBeenCalled();
    });
  });
});
