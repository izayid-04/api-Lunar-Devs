import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.servicesService.findBySlug(slug);
  }
}
