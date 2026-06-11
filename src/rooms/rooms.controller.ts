import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtBearerAuthGuard } from '../app-auth/jwt-bearer-auth.guard';
import { RoomsService } from './rooms.service';

type CreateRoomRequest = {
  roomType: 'audio' | 'video';
  roombio?: string | null;
  roomdp?: string | null;
  roomCountryCode?: string | null;
  roomTag?: string | null;
  announcementMsg?: string | null;
  isSeatLock?: boolean;
  canVisitorsTakeMic?: boolean;
  password?: string | null;
  totalGifting?: number;
  roomReward?: number;
  entranceFee?: number;
  roomDynamicBackgroundModel?: string | null;
};

@Controller('app/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(JwtBearerAuthGuard)
  @Get('my')
  async getMyRooms(@Req() req: any) {
    return this.roomsService.getMyRooms(req.user.sub);
  }

  @UseGuards(JwtBearerAuthGuard)
  @Get(':roomId')
  async getRoomById(@Param('roomId') roomId: string) {
    return this.roomsService.getRoomById(roomId);
  }

  @UseGuards(JwtBearerAuthGuard)
  @Post()
  async createRoom(@Req() req: any, @Body() body: CreateRoomRequest) {
    return this.roomsService.createRoom(req.user.sub, body);
  }
}
