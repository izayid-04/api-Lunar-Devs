import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  type Relation,
} from 'typeorm';
import type { Consultation } from './consultation.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('consultation_responses')
@Unique(['consultationId', 'citizenId'])
export class ConsultationResponse {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Consultation', 'responses', {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'consultation_id' })
  consultation!: Relation<Consultation>;

  @Column({ name: 'consultation_id' })
  consultationId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'citizen_id' })
  citizen!: User;

  @Column({ name: 'citizen_id' })
  citizenId!: number;

  @Column({ type: 'varchar', length: 100, name: 'reference', unique: true })
  reference!: string;

  @Column({ type: 'varchar', length: 255 })
  option!: string;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
