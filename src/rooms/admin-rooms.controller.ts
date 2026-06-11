import { Body, Controller, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';

type CreateSeatStyleRequest = {
  styleNumber: number;
  totalSeats: number;
  seatImagePath: string;
  hostEnable: boolean;
  hostSeatPath?: string | null;
  free: boolean;
  price: number;
};

@Controller('admin/rooms')
export class AdminRoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('seat-styles')
  async createSeatStyle(@Body() body: CreateSeatStyleRequest) {
    return this.roomsService.createSeatStyle(body);
  }
}
