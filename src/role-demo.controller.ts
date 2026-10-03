import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { Roles } from './auth/roles.decorator.js';
import { RolesGuard } from './auth/roles.guard.js';
import { UserRole } from './users/user-role.enum.js';

// Demo endpoints proving role-based access control works end to end
// (D09): a citizen gets 403 on both, an agent only passes /agent/ping, an
// admin passes both.

@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgentPingController {
  @Get('ping')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  ping() {
    return { status: 'ok', scope: 'agent' };
  }
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPingController {
  @Get('ping')
  @Roles(UserRole.ADMIN)
  ping() {
    return { status: 'ok', scope: 'admin' };
  }
}
