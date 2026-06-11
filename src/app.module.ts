import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssetsModule } from './assets/assets.module';
import { AppAuthModule } from './app-auth/app-auth.module';
import { RoomsModule } from './rooms/rooms.module';
import * as dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

@Module({
  imports: [AssetsModule, AppAuthModule, RoomsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
