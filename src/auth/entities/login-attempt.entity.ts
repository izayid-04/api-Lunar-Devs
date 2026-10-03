import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'login_attempts' })
export class LoginAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  email!: string;

  @Column({ type: 'varchar', length: 64 })
  ip!: string;

  @Column({ type: 'boolean' })
  success!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
