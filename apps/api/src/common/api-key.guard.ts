import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';

const REQUIRED_SCOPES = 'requiredApiScopes';
export const RequireApiScopes = (...scopes: string[]) => SetMetadata(REQUIRED_SCOPES, scopes);

export interface TenantRequest {
  headers: Record<string, string | string[] | undefined>;
  tenantId: string;
  apiKeyId: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const rawKey = request.headers['x-api-key'];
    if (typeof rawKey !== 'string' || rawKey.length < 32) throw new UnauthorizedException('A valid API key is required');

    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await this.prisma.client.tenantApiKey.findUnique({ where: { keyHash }, include: { tenant: true } });
    const now = new Date();
    if (!apiKey || apiKey.tenant.status !== 'ACTIVE' || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt <= now)) {
      throw new UnauthorizedException('A valid API key is required');
    }

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];
    if (!requiredScopes.every((scope) => apiKey.scopes.includes(scope))) {
      throw new ForbiddenException('API key does not have the required scope');
    }

    request.tenantId = apiKey.tenantId;
    request.apiKeyId = apiKey.id;
    return true;
  }
}
