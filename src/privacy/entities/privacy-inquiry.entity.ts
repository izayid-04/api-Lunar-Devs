import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum PrivacyInquiryType {
  ACCESS = 'acces', // Accès aux données
  RECTIFICATION = 'rectification', // Rectification
  DELETION = 'effacement', // Droit à l'effacement
  EXPLANATION = 'explication', // Inquiétude / Explication sur l'utilisation
  OPPOSITION = 'opposition', // Opposition de traitement
  OTHER = 'autre',
}

export enum PrivacyInquiryStatus {
  PENDING = 'en_attente',
  IN_REVIEW = 'en_cours',
  ANSWERED = 'traitee',
  CLOSED = 'fermee',
}

@Entity('privacy_inquiries')
export class PrivacyInquiry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  reference!: string; // e.g. 'RGPD-2026-0001'

  @Index()
  @Column({ type: 'varchar', length: 40, default: PrivacyInquiryType.EXPLANATION })
  type!: PrivacyInquiryType;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: PrivacyInquiryStatus.PENDING })
  status!: PrivacyInquiryStatus;

  @Column({ type: 'text', nullable: true })
  responseNote!: string | null;

  @Column({ type: 'datetime', nullable: true })
  respondedAt!: Date | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false, eager: true })
  @JoinColumn({ name: 'citizen_id' })
  citizen!: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'responded_by_id' })
  respondedBy!: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
