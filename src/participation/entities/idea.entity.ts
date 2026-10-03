import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum IdeaStatus {
  SOUMISE = 'soumise',
  EN_ETUDE = 'en_etude',
  RETENUE = 'retenue',
  REJETEE = 'rejetee',
}

@Entity('ideas')
export class Idea {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  reference!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  @Column({
    type: 'enum',
    enum: IdeaStatus,
    default: IdeaStatus.SOUMISE,
  })
  status!: IdeaStatus;

  @Column({ type: 'text', name: 'admin_note', nullable: true })
  adminNote!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'citizen_id' })
  citizen!: User;

  @Column({ name: 'citizen_id' })
  citizenId!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
