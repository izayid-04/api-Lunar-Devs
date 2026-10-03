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

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  details!: string;

  @Column()
  contact!: string;

  @Column()
  horaires!: string;

  // Neighborhood name — plain text, used by the front to group/place
  // services on an interactive map later.
  @Column()
  district!: string;

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
