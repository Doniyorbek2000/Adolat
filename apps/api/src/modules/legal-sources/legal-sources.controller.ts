import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { LegalSourcesService } from './legal-sources.service';
import { CreateLegalSourceDto } from './dto/create-legal-source.dto';
import { UpdateLegalSourceDto } from './dto/update-legal-source.dto';

@ApiTags('legal-sources')
@ApiBearerAuth()
@Controller('legal-sources')
export class LegalSourcesController {
  constructor(private readonly legalSourcesService: LegalSourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List all legal sources with chunk counts' })
  findAll() {
    return this.legalSourcesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single legal source by ID' })
  findOne(@Param('id') id: string) {
    return this.legalSourcesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new legal source (admin)' })
  create(@Body() dto: CreateLegalSourceDto, @CurrentUser() user: RequestUser) {
    return this.legalSourcesService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a legal source (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateLegalSourceDto) {
    return this.legalSourcesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disable a legal source (admin, soft delete)' })
  disable(@Param('id') id: string) {
    return this.legalSourcesService.disable(id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger a sync job for a legal source (admin)' })
  triggerSync(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.legalSourcesService.triggerSync(id, user.id);
  }

  @Get(':id/sync-jobs')
  @ApiOperation({ summary: 'List recent sync jobs for a legal source' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSyncJobs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.legalSourcesService.getSyncJobs(id, limit ? parseInt(limit, 10) : 10);
  }
}
