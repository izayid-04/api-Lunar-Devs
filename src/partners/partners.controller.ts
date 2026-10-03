import { Controller, Get, Query } from '@nestjs/common';
import { PartnersService } from './partners.service.js';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  async getPartners(@Query('district') district?: string) {
    return this.partnersService.findAll(district);
  }
}
