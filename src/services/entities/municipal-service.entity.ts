import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
