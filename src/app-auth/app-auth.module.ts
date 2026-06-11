import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppAuthController } from './app-auth.controller';
import { AppAuthService } from './app-auth.service';
import { JwtBearerAuthGuard } from './jwt-bearer-auth.guard';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.APP_JWT_SECRET?.trim() || 'emochat-dev-secret-change-me',
      signOptions: {
        expiresIn:
          Number(process.env.APP_JWT_EXPIRES_SECONDS) || 60 * 60 * 24 * 7,
      },
    }),
  ],
  controllers: [AppAuthController],
  providers: [AppAuthService, JwtBearerAuthGuard],
  exports: [AppAuthService, JwtModule, JwtBearerAuthGuard],
})
export class AppAuthModule {}
