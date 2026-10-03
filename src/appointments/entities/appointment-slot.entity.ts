import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { MunicipalService } from '../../services/entities/municipal-service.entity.js';

@Entity({ name: 'appointment_slots' })
export class AppointmentSlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent!: User | null;

  @ManyToOne(() => MunicipalService, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service!: MunicipalService;

  @Column({ name: 'starts_at', type: 'datetime' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'datetime' })
  endsAt!: Date;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
