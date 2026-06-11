import { Module } from '@nestjs/common';
import { AppAuthModule } from '../app-auth/app-auth.module';
import { AdminRoomsController } from './admin-rooms.controller';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [AppAuthModule],
  controllers: [RoomsController, AdminRoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
