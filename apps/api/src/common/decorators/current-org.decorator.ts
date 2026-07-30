import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokenPayload } from '@scorra/types';

export const CurrentOrgId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthTokenPayload }>();
    const orgId = request.user?.organizationId;
    if (!orgId) {
      throw new ForbiddenException('Organization context required');
    }
    return orgId;
  },
);
