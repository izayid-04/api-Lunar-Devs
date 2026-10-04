import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { UpdateServiceAvailabilityDto } from './dto/update-service-availability.dto.js';
import { ListServicesQueryDto } from './dto/list-services-query.dto.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';
import { HttpCacheInterceptor } from '../common/http-cache.interceptor.js';

@Controller('services')
@UseInterceptors(HttpCacheInterceptor)
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.servicesService.updateAvailability(idOrSlug, dto, user.sub);
  }
}
