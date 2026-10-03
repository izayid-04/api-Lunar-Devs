import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentSlot } from './entities/appointment-slot.entity.js';
import { Appointment } from './entities/appointment.entity.js';
import { AppointmentsService } from './appointments.service.js';
import {
  AppointmentsController,
  AgentAppointmentsController,
} from './appointments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppointmentSlot, Appointment])],
  controllers: [AppointmentsController, AgentAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
