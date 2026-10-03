import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity.js';
import { Consultation } from './entities/consultation.entity.js';
import { ConsultationResponse } from './entities/consultation-response.entity.js';
import { Idea } from './entities/idea.entity.js';
import { ParticipationService } from './participation.service.js';
import { ProjectsController } from './projects.controller.js';
import { IdeasController } from './ideas.controller.js';
import { AgentIdeasController } from './agent-ideas.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Consultation,
      ConsultationResponse,
      Idea,
    ]),
    UsersModule,
  ],
  controllers: [
    ProjectsController,
    IdeasController,
    AgentIdeasController,
  ],
  providers: [ParticipationService],
  exports: [ParticipationService],
})
export class ParticipationModule {}
