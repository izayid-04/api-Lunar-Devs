import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from './user-role.enum.js';

export type SafeUser = Omit<User, 'passwordHash'>;

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

  toSafe(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
