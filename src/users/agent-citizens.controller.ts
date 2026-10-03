import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from './user-role.enum.js';
import { UsersService } from './users.service.js';
import { ListCitizensQueryDto } from './dto/list-citizens-query.dto.js';
import { UpdateCitizenStatusDto } from './dto/update-citizen-status.dto.js';

@Controller('agent/citizens')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentCitizensController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findCitizens(@Query() query: ListCitizensQueryDto) {
    return this.usersService.findCitizens(query);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCitizenStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateCitizenStatus(id, dto.isActive, user.sub);
  }
}
