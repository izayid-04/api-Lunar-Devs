import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from './user-role.enum.js';

// `id` is serialized as a string on the wire (consumers, e.g. the
// frontend, expect a string id) even though it's a numeric auto-increment
// column in MySQL.
export type SafeUser = Omit<User, 'passwordHash' | 'id'> & { id: string };

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}

  // Lazily resolved on each call, never cached: the DataSource is
  // connected after this service is instantiated (manualInitialization
  // in app.module.ts, initialized from main.ts), so metadata/connection
  // must only be touched once a request actually comes in.
  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(User);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findSafeById(id: number): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafe(user);
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    const user = this.repository.create(input);
    const saved = await this.repository.save(user);
    return this.toSafe(saved);
  }

  countByRole(role: UserRole): Promise<number> {
    return this.repository.count({ where: { role } });
  }

  async updateProfile(
    id: number,
    patch: {
      district?: string;
      preferredLanguage?: string;
      isVulnerable?: boolean;
    },
  ): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Explicit undefined checks, not Object.assign: an omitted optional
    // field still exists as an explicit `undefined` own property on the
    // DTO instance (TS class field semantics), which would otherwise
    // null out a field the client didn't intend to touch.
    if (patch.district !== undefined) user.district = patch.district;
    if (patch.preferredLanguage !== undefined) {
      user.preferredLanguage = patch.preferredLanguage;
    }
    if (patch.isVulnerable !== undefined) user.isVulnerable = patch.isVulnerable;

    // Server-computed, not client-settable: "complete" once the two
    // required fields are filled in.
    user.profileCompleted = Boolean(user.district && user.preferredLanguage);

    const saved = await this.repository.save(user);
    return this.toSafe(saved);
  }

  toSafe(user: User): SafeUser {
    const { passwordHash: _passwordHash, id, ...safe } = user;
    return { ...safe, id: String(id) };
  }
}
