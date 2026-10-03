import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'announcements' })
export class Announcement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column()
  category!: string;

  @Column({ name: 'published_at', type: 'datetime' })
  publishedAt!: Date;

  // Nullable + SET NULL: deleting the authoring account must not delete
  // the city's published announcements, only lose the attribution (which
  // isn't exposed publicly anyway, see AnnouncementsService).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author!: User | null;
}
