import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import type { CitizenMessage } from './citizen-message.entity.js';

@Entity({ name: 'message_supports' })
@Unique(['messageId', 'userId'])
export class MessageSupport {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('CitizenMessage', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message!: CitizenMessage;

  @Column({ name: 'message_id', type: 'int' })
  messageId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
