import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LoginAttempt } from './entities/login-attempt.entity.js';

@Injectable()
export class LoginAttemptsService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(LoginAttempt);
  }

  async recordAttempt(email: string, ip: string, success: boolean): Promise<LoginAttempt> {
    const attempt = this.repository.create({
      email,
      ip,
      success,
    });
    return this.repository.save(attempt);
  }

  async checkLockout(email: string): Promise<{ isLocked: boolean; lockedUntil: Date | null }> {
    const windowStart = new Date(Date.now() - 15 * 60 * 1000); // 15 min sliding window

    // Retrieve recent attempts for this email in descending order
    const recent = await this.repository.find({
      where: { email },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    if (recent.length === 0) {
      return { isLocked: false, lockedUntil: null };
    }

    // Count consecutive failures starting from the most recent attempt
    const consecutiveFailures: LoginAttempt[] = [];
    for (const attempt of recent) {
      if (!attempt.success) {
        consecutiveFailures.push(attempt);
      } else {
        break; // Stop at the first success
      }
    }

    if (consecutiveFailures.length >= 5) {
      // Find the most recent failure's timestamp
      const latestFailure = consecutiveFailures[0];
      const lockedUntil = new Date(latestFailure.createdAt.getTime() + 15 * 60 * 1000);
      if (new Date() < lockedUntil) {
        return { isLocked: true, lockedUntil };
      }
    }

    return { isLocked: false, lockedUntil: null };
  }

  async getMyRecentAttempts(email: string) {
    const [recentAttempts, lastSuccessful] = await Promise.all([
      this.repository.find({
        where: { email },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.repository.findOne({
        where: { email, success: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const recentFailures = recentAttempts.filter((a) => !a.success);

    return {
      lastLoginAt: lastSuccessful ? lastSuccessful.createdAt : null,
      lastLoginIp: lastSuccessful ? lastSuccessful.ip : null,
      recentFailures: recentFailures.map((f) => ({
        id: f.id,
        ip: f.ip,
        date: f.createdAt,
      })),
      history: recentAttempts.map((a) => ({
        id: a.id,
        ip: a.ip,
        success: a.success,
        date: a.createdAt,
      })),
    };
  }

  async getTargetedAccounts() {
    // Accounts with recent failed attempts in the last 24h
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const raw = await this.repository
      .createQueryBuilder('attempt')
      .select('attempt.email', 'email')
      .addSelect('COUNT(*)', 'failedCount')
      .addSelect('MAX(attempt.created_at)', 'lastFailedAt')
      .where('attempt.success = false')
      .andWhere('attempt.created_at >= :since', { since })
      .groupBy('attempt.email')
      .orderBy('failedCount', 'DESC')
      .limit(50)
      .getRawMany<{ email: string; failedCount: string; lastFailedAt: string }>();

    return raw.map((item) => ({
      email: item.email,
      failedAttemptsCount: Number(item.failedCount),
      lastFailedAt: item.lastFailedAt,
    }));
  }
}
