import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { NotificationType } from '../notification-type.enum.js';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column()
  title!: string;

  @Column()
  link!: string;

  @Column({ name: 'read_at', type: 'datetime', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
