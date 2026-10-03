import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceAvailability } from '../service-availability.enum.js';

@Entity({ name: 'municipal_services' })
export class MunicipalService {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  // Catégorie fonctionnelle (sante, securite, administratif, culture, education, voirie, eau-energie, tourisme)
  @Column({ default: 'administratif' })
  category!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  details!: string;

  @Column()
  contact!: string;

  @Column()
  horaires!: string;

  // Neighborhood name — plain text from DISTRICTS
  @Column()
  district!: string;

  // F45 - Cartographie physique
  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number | null;

  // F28 - Services mis en avant en premier
  @Column({ name: 'is_featured', default: false })
  featured!: boolean;

  // F46 - Services d'urgence / santé vitale
  @Column({ name: 'is_emergency', default: false })
  isEmergency!: boolean;

  // F38 — Disponibilité des services
  @Column({
    type: 'enum',
    enum: ServiceAvailability,
    default: ServiceAvailability.DISPONIBLE,
  })
  availability!: ServiceAvailability;

  @Column({ name: 'availability_message', type: 'text', nullable: true })
  availabilityMessage!: string | null;

  @Column({ name: 'available_again_at', type: 'datetime', nullable: true })
  availableAgainAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  alternative!: string | null;
}
