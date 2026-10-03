import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransportsService } from './transports.service.js';
import { ListTransportsQueryDto, UpdateTransportStatusDto } from './dto/transports.dto.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';

@Controller('transports')
export class TransportsController {
  constructor(
    private readonly transportsService: TransportsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  findAll(@Query() query: ListTransportsQueryDto) {
    return this.transportsService.findAll(query);
  }

  @Get(':codeOrId')
  findOne(@Param('codeOrId') codeOrId: string) {
    return this.transportsService.findByCodeOrId(codeOrId);
  }

  @Patch(':codeOrId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async updateStatus(
    @Param('codeOrId') codeOrId: string,
    @Body() dto: UpdateTransportStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const actingUser = await this.usersService.findById(user.sub);
    return this.transportsService.updateStatus(codeOrId, dto, actingUser);
  }
}
