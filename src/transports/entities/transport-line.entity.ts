import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TransportType {
  NAVETTE = 'navette',
  BUS = 'bus',
  TRAM = 'tram',
  BATELIER = 'batelier',
}

export enum TransportLineStatus {
  NORMAL = 'normal',
  PERTURBE = 'perturbe',
  INTERROMPU = 'interrompu',
}

@Entity('transport_lines')
export class TransportLine {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code!: string; // e.g. 'L1', 'NAV-NORD', 'T1'

  @Column({ type: 'varchar', length: 150 })
  name!: string; // e.g. 'Ligne 1 : Centre Urbain - Port Stellaire'

  @Index()
  @Column({ type: 'varchar', length: 30, default: TransportType.NAVETTE })
  type!: TransportType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  origin!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destination!: string | null;

  @Column({ type: 'varchar', length: 30, default: TransportLineStatus.NORMAL })
  status!: TransportLineStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  statusMessage!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  frequency!: string | null; // e.g. 'Toutes les 10 min'

  @Column({ type: 'varchar', length: 100, nullable: true })
  operatingHours!: string | null; // e.g. '06:00 - 22:30'

  @Column({ type: 'text', nullable: true })
  stops!: string | null; // JSON array of stop names

  @Column({ type: 'text', nullable: true })
  nextDepartures!: string | null; // JSON array or string of upcoming times

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
