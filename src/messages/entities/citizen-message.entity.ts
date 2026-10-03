import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { MessageStatus } from '../message-status.enum.js';
import { MessageType } from '../message-type.enum.js';
import { MessageStatusHistory } from './message-status-history.entity.js';
import { MessageSupport } from './message-support.entity.js';

@Entity({ name: 'citizen_messages' })
export class CitizenMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  // Human-readable confirmation code (e.g. "NT-0001"), derived from `id`
  // once it's known — set right after insert, see MessagesService.create.
  // Nullable at the schema level only for that brief window.
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  reference!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column({ name: 'author_id', type: 'int' })
  authorId!: number;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.QUESTION,
  })
  type!: MessageType;

  @Column({ length: 150 })
  subject!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ length: 100 })
  category!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  @Column({ name: 'precise_location', type: 'varchar', length: 255, nullable: true })
  preciseLocation!: string | null;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.NOUVEAU })
  status!: MessageStatus;

  // F52 : Nombre de soutiens reçus
  @Column({ name: 'support_count', type: 'int', default: 0 })
  supportCount!: number;

  @OneToMany(() => MessageStatusHistory, (history) => history.message)
  history!: MessageStatusHistory[];

  @OneToMany(() => MessageSupport, (support) => support.message)
  supports!: MessageSupport[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
