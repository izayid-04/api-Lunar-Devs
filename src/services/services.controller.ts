import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { UpdateServiceAvailabilityDto } from './dto/update-service-availability.dto.js';
import { ListServicesQueryDto } from './dto/list-services-query.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@Query() query: ListServicesQueryDto) {
    return this.servicesService.findAll(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.servicesService.findBySlug(slug);
  }

  @Patch(':idOrSlug/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  updateAvailability(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: UpdateServiceAvailabilityDto,
  ) {
    return this.servicesService.updateAvailability(idOrSlug, dto);
  }
}
