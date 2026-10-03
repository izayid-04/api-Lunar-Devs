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
import { MessageStatus } from '../message-status.enum.js';

@Entity({ name: 'citizen_messages' })
export class CitizenMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  // Human-readable confirmation code (e.g. "NT-0001"), derived from `id`
  // once it's known — set right after insert, see MessagesService.create.
  // Nullable at the schema level only for that brief window.
  @Column({ type: 'varchar', unique: true, nullable: true })
  reference!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column()
  subject!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column()
  category!: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.NOUVEAU })
  status!: MessageStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
