import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

export interface DatabaseHealthStatus {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  check(): HealthStatus {
    return {
      status: 'ok',
      service: 'adolat-ai-api',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    };
  }

  async checkDatabase(): Promise<DatabaseHealthStatus> {
    const isUp = await this.prisma.isHealthy();
    return {
      status: isUp ? 'ok' : 'error',
      database: isUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
