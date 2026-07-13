import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { DatabaseHealthStatus, HealthService, HealthStatus } from './health.service';

// Health-check endpointlari ochiq bo'lishi shart (load balancer / Docker healthcheck).
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Service liveness/readiness check' })
  check(): HealthStatus {
    return this.healthService.check();
  }

  @Get('db')
  @Public()
  @ApiOperation({ summary: 'Database (PostgreSQL/Prisma) connection health check' })
  checkDatabase(): Promise<DatabaseHealthStatus> {
    return this.healthService.checkDatabase();
  }
}
