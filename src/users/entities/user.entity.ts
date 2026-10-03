import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../user-role.enum.js';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CITIZEN })
  role!: UserRole;

  // F34 — Désactivation administrative du compte
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // Profile fields (D12, F29, F31 prep) — all optional until the user
  // completes their profile via PATCH /me.
  @Column({ type: 'varchar', nullable: true })
  district!: string | null;

  @Column({ name: 'preferred_language', type: 'varchar', nullable: true })
  preferredLanguage!: string | null;

  @Column({ name: 'is_vulnerable', default: false })
  isVulnerable!: boolean;

  // Server-computed (not client-settable directly): true once district
  // and preferredLanguage are both set. See UsersService.updateProfile.
  @Column({ name: 'profile_completed', default: false })
  profileCompleted!: boolean;

  @Column({ name: 'failed_login_attempts', default: 0, select: false })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true, select: false })
  lockedUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
