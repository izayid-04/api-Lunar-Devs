import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { AppointmentSlot } from './appointment-slot.entity.js';
import { AppointmentStatus } from '../appointment-status.enum.js';

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'citizen_id' })
  citizen!: User;

  @ManyToOne(() => AppointmentSlot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slot_id' })
  slot!: AppointmentSlot;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;

  @Column({ name: 'required_documents', type: 'text', nullable: true })
  requiredDocuments!: string | null;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.CONFIRME,
  })
  status!: AppointmentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
