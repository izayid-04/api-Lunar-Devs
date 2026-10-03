import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity.js';


@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Project, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'project_id' })
  project!: Project;


  @Column({ name: 'project_id' })
  projectId!: number;

  @Column({ type: 'varchar', length: 255 })
  question!: string;

  @Column({ type: 'simple-json' })
  options!: string[];

  @Column({ type: 'datetime', name: 'end_date' })
  endDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

