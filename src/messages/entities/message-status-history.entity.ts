import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { MessageStatus } from '../message-status.enum.js';
import type { CitizenMessage } from './citizen-message.entity.js';

@Entity({ name: 'message_status_history' })
export class MessageStatusHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('CitizenMessage', 'history', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message!: CitizenMessage;

  @Column({ name: 'message_id', type: 'int' })
  messageId!: number;

  @Column({ type: 'enum', enum: MessageStatus })
  status!: MessageStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy!: User | null;

  @Column({ name: 'changed_by_id', type: 'int', nullable: true })
  changedById!: number | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;
}
