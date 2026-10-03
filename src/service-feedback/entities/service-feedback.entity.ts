import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MunicipalService } from '../../services/entities/municipal-service.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('service_feedbacks')
@Unique(['serviceId', 'citizenId'])
export class ServiceFeedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => MunicipalService, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'service_id' })
  service!: MunicipalService;

  @Column({ name: 'service_id' })
  serviceId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'citizen_id' })
  citizen!: User;

  @Column({ name: 'citizen_id' })
  citizenId!: number;

  @Column({ type: 'int' })
  rating!: number; // 1 to 5

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'reference', unique: true })
  reference!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
