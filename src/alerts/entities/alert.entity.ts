import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { AlertSeverity, AlertTarget } from '../alert-enums.js';

@Entity({ name: 'alerts' })
export class Alert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.INFO,
  })
  severity!: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertTarget,
    default: AlertTarget.ALL,
  })
  target!: AlertTarget;

  @Column({ name: 'target_district', type: 'varchar', nullable: true })
  targetDistrict!: string | null;

  @Column({ name: 'starts_at', type: 'datetime' })
  startsAt!: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
