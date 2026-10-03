import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrivacyService } from './privacy.service.js';
import {
  CreatePrivacyInquiryDto,
  UpdatePrivacyInquiryStatusDto,
} from './dto/privacy-inquiry.dto.js';
import { PrivacyInquiryStatus } from './entities/privacy-inquiry.entity.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';

@Controller('privacy/inquiries')
@UseGuards(JwtAuthGuard)
export class PrivacyInquiriesController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Post()
  @Roles(UserRole.CITIZEN)
  @UseGuards(RolesGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePrivacyInquiryDto,
  ) {
    return this.privacyService.create(user.sub, dto);
  }

  @Get('mine')
  @Roles(UserRole.CITIZEN)
  @UseGuards(RolesGuard)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.privacyService.findMine(user.sub);
  }
}

@Controller('agent/privacy/inquiries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentPrivacyInquiriesController {
  constructor(
    private readonly privacyService: PrivacyService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(@Query('status') status?: PrivacyInquiryStatus) {
    return this.privacyService.findAllForStaff(status);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrivacyInquiryStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const staffUser = await this.usersService.findById(user.sub);
    return this.privacyService.updateStatus(id, dto, staffUser!);
  }
}
