import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthStatus, HealthService, HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Service liveness/readiness check' })
  check(): HealthStatus {
    return this.healthService.check();
  }

  @Get('db')
  @ApiOperation({ summary: 'Database (PostgreSQL/Prisma) connection health check' })
  checkDatabase(): Promise<DatabaseHealthStatus> {
    return this.healthService.checkDatabase();
  }
}
