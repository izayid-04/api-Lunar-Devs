import * as bcrypt from 'bcryptjs';
import type { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';

const BCRYPT_SALT_ROUNDS = 10;

interface DemoAccount {
  role: UserRole;
  email: string | undefined;
  password: string | undefined;
  firstName: string;
  lastName: string;
  envLabel: string;
}

// Read lazily (inside the function, not at module-evaluation time) so
// this never races against dotenv loading .env in local dev.
function getDemoAccounts(): DemoAccount[] {
  return [
    {
      role: UserRole.AGENT,
      email: process.env.DEMO_AGENT_EMAIL,
      password: process.env.DEMO_AGENT_PASSWORD,
      firstName: 'Agent',
      lastName: 'Demo',
      envLabel: 'DEMO_AGENT_EMAIL / DEMO_AGENT_PASSWORD',
    },
    {
      role: UserRole.ADMIN,
      email: process.env.DEMO_ADMIN_EMAIL,
      password: process.env.DEMO_ADMIN_PASSWORD,
      firstName: 'Admin',
      lastName: 'Demo',
      envLabel: 'DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD',
    },
  ];
}

// Idempotent: safe to run on every boot (migrationsRun-style). Skips an
// account whose env vars are unset, and skips creating it again if a user
// with that email already exists — it never overwrites an existing
// account's password or role.
export async function seedDemoUsers(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(User);

  for (const account of getDemoAccounts()) {
    if (!account.email || !account.password) {
      console.warn(
        `Skipping ${account.role} demo seed: ${account.envLabel} not set.`,
      );
      continue;
    }

    const existing = await repository.findOne({
      where: { email: account.email },
    });
    if (existing) {
      console.log(`Demo ${account.role} account already exists, skipping.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(
      account.password,
      BCRYPT_SALT_ROUNDS,
    );
    await repository.save(
      repository.create({
        email: account.email,
        passwordHash,
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
      }),
    );
    console.log(`Demo ${account.role} account created (${account.email}).`);
  }
}
