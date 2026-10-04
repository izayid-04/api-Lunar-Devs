import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { PartnersService } from './partners.service.js';
import { HttpCacheInterceptor } from '../common/http-cache.interceptor.js';

@Controller('partners')
@UseInterceptors(HttpCacheInterceptor)
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  async getPartners(@Query('district') district?: string) {
    return this.partnersService.findAll(district);
  }
}
