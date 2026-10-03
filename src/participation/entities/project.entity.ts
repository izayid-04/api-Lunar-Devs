import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';


export enum ProjectStatus {
  PROPOSE = 'propose',
  EN_COURS = 'en_cours',
  TERMINE = 'termine',
  SUSPENDU = 'suspendu',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 100 })
  district!: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.EN_COURS,
  })
  status!: ProjectStatus;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

