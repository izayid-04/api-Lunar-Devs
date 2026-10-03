import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { MeController } from './me.controller.js';
import { RolesGuard } from './roles.guard.js';

if (!process.env.JWT_SECRET) {
  console.warn(
    'JWT_SECRET is not set: token signing/verification will fail at runtime.',
  );
}

// @Global() + JwtModule { global: true } so JwtAuthGuard/RolesGuard can be
// used with @UseGuards(...) from any feature module without having to
// re-import AuthModule everywhere (useful as more Nova Terra blocks get
// their own modules).
@Global()
@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
