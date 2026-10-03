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

@Entity({ name: 'known_devices' })
@Index(['userId', 'deviceFingerprint'], { unique: true })
export class KnownDevice {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @Column({ name: 'device_fingerprint', type: 'varchar', length: 64 })
  deviceFingerprint!: string;

  @Column({ type: 'varchar', length: 150 })
  label!: string;

  @Column({ name: 'last_ip', type: 'varchar', length: 45 })
  lastIp!: string;

  @CreateDateColumn({ name: 'first_seen_at' })
  firstSeenAt!: Date;

  @UpdateDateColumn({ name: 'last_seen_at' })
  lastSeenAt!: Date;
}
