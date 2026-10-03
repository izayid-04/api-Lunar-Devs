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
import { UsersService } from './users.service.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { UserRole } from './user-role.enum.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { AdminCreateUserDto } from './dto/admin-create-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UpdateCitizenStatusDto } from './dto/update-citizen-status.dto.js';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.adminFindUsers(query);
  }

  @Post()
  createUser(
    @Body() dto: AdminCreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.adminCreateUser(dto, user.sub);
  }

  @Patch(':id/role')
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.adminUpdateUserRole(id, dto.role, user.sub);
  }

  @Patch(':id/status')
  updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCitizenStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.adminUpdateUserStatus(id, dto.isActive, user.sub);
  }
}
