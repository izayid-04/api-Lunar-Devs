import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppointmentsService } from './appointments.service.js';
import { BookAppointmentDto } from './dto/book-appointment.dto.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // Public/Citizen: list available slots for a service
  @Get('slots')
  getAvailableSlots(@Query('service') service: string) {
    return this.appointmentsService.getAvailableSlots(service);
  }

  // Citizen: book a slot
  @Post('book/:slotId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CITIZEN)
  bookSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: BookAppointmentDto,
  ) {
    return this.appointmentsService.bookAppointment(user.sub, slotId, dto);
  }

  // Citizen: list their appointments
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  getMyAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.appointmentsService.getMyAppointments(user.sub);
  }

  // Citizen: cancel an appointment
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelAppointment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentsService.cancelAppointment(user.sub, id);
  }

  // ICS download
  @Get(':id/ics')
  @UseGuards(JwtAuthGuard)
  async getIcs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const icsContent = await this.appointmentsService.generateIcs(id, user);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rendez-vous-${id}.ics"`,
    );
    res.send(icsContent);
  }
}

@Controller('agent/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentAppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  getAppointments(@Query('serviceId') serviceId?: string) {
    return this.appointmentsService.getAgentAppointments(
      serviceId ? Number(serviceId) : undefined,
    );
  }
}
