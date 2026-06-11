/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Collection, MongoClient, ObjectId, WithId } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { AppAuthService } from '../app-auth/app-auth.service';

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

type CreateSeatStyleRequest = {
  styleNumber: number;
  totalSeats: number;
  seatImagePath: string;
  hostEnable: boolean;
  hostSeatPath?: string | null;
  free: boolean;
  price: number;
};

type RoomDocument = {
  ownerid: string;
  owneruserid: ObjectId;
  seatStyleReferenceId: ObjectId;
  room_bg: number;
  roomType: 'audio' | 'video';
  roomname: string;
  roombio: string | null;
  roomdp: string | null;
  roomid: string;
  roomCountryCode: string | null;
  roomTag: string | null;
  announcementMsg: string | null;
  isSeatLock: boolean;
  canVisitorsTakeMic: boolean;
  password: string | null;
  totalGifting: number;
  roomReward: number;
  entranceFee: number;
  roomDynamicBackgroundModel: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SeatStyleDocument = {
  styleNumber: number;
  totalSeats: number;
  seatImagePath: string;
  hostEnable: boolean;
  hostSeatPath: string | null;
  free: boolean;
  price: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RoomsService {
  private client: MongoClient | null = null;
  private roomsCollection: Collection<RoomDocument> | null = null;
  private roomsCollectionPromise: Promise<Collection<RoomDocument>> | null = null;
  private seatStylesCollection: Collection<SeatStyleDocument> | null = null;
  private seatStylesCollectionPromise: Promise<Collection<SeatStyleDocument>> | null = null;

  constructor(private readonly appAuthService: AppAuthService) {}

  async getMyRooms(ownerUserId: string) {
    if (!ownerUserId?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.appAuthService.getUserRaw(ownerUserId);
    const audioRoomReferenceId =
      user.audioRoomReferenceId ?? (user as any).profile?.audioRoomReferenceId ?? null;
    const videoRoomReferenceId =
      user.videoRoomReferenceId ?? (user as any).profile?.videoRoomReferenceId ?? null;

    return {
      audioRoomReferenceId: audioRoomReferenceId
        ? await this.findRoomById(audioRoomReferenceId)
        : null,
      videoRoomReferenceId: videoRoomReferenceId
        ? await this.findRoomById(videoRoomReferenceId)
        : null,
    };
  }

  async getRoomById(roomId: string) {
    if (!ObjectId.isValid(roomId)) {
      throw new BadRequestException('Invalid room id');
    }

    const room = await this.findRoomById(new ObjectId(roomId));
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async createSeatStyle(payload: CreateSeatStyleRequest) {
    const styleNumber = this.normalizeStyleNumber(payload.styleNumber);
    const totalSeats = this.normalizeTotalSeats(payload.totalSeats);
    const seatImagePath = this.normalizeRequiredString(
      payload.seatImagePath,
      '`seatImagePath` is required',
    );
    const hostEnable = this.normalizeBoolean(payload.hostEnable, '`hostEnable` is required');
    const hostSeatPath = this.normalizeNullableString(payload.hostSeatPath);
    const free = this.normalizeBoolean(payload.free, '`free` is required');
    const price = this.normalizePrice(payload.price);
    const now = new Date();

    const collection = await this.getSeatStylesCollection();
    const existing = await collection.findOne({ styleNumber });

    if (existing) {
      throw new ConflictException('Seat style already exists for this style number');
    }

    const seatStyle: SeatStyleDocument = {
      styleNumber,
      totalSeats,
      seatImagePath,
      hostEnable,
      hostSeatPath,
      free,
      price,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(seatStyle);

    return {
      _id: result.insertedId,
      ...this.mapSeatStyleResponse(seatStyle),
    };
  }

  async createRoom(ownerUserId: string, payload: CreateRoomRequest) {
    if (!ownerUserId?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const roomType = this.normalizeRoomType(payload.roomType);
    const roomname = await this.resolveRoomName(ownerUserId);
    const ownerMongoId = await this.appAuthService.getUserObjectId(ownerUserId);
    const defaultSeatStyle = await this.findSeatStyleByStyleNumber(1);
    const now = new Date();
    const roomid = `room_${randomUUID().replace(/-/g, '')}`;

    if (!defaultSeatStyle?._id) {
      throw new InternalServerErrorException('Default seat style is not configured');
    }

    const room: RoomDocument = {
      ownerid: ownerUserId,
      owneruserid: ownerMongoId,
      seatStyleReferenceId: defaultSeatStyle._id,
      room_bg: 1,
      roomType,
      roomname,
      roombio: this.normalizeNullableString(payload.roombio),
      roomdp: this.normalizeNullableString(payload.roomdp),
      roomid,
      roomCountryCode: this.normalizeNullableString(payload.roomCountryCode),
      roomTag: this.normalizeNullableString(payload.roomTag),
      announcementMsg: this.normalizeNullableString(payload.announcementMsg),
      isSeatLock: Boolean(payload.isSeatLock),
      canVisitorsTakeMic:
        payload.canVisitorsTakeMic === undefined ? true : Boolean(payload.canVisitorsTakeMic),
      password: this.normalizeNullableString(payload.password),
      totalGifting: this.normalizeNumber(payload.totalGifting, 0),
      roomReward: this.normalizeNumber(payload.roomReward, 0),
      entranceFee: this.normalizeNumber(payload.entranceFee, 0),
      roomDynamicBackgroundModel: this.normalizeNullableString(
        payload.roomDynamicBackgroundModel,
      ),
      createdAt: now,
      updatedAt: now,
    };

    const collection = await this.getRoomsCollection();
    const result = await collection.insertOne(room);
    await this.appAuthService.setRoomReferenceId(
      ownerUserId,
      roomType,
      result.insertedId,
    );
    const ownerProfile = await this.appAuthService.getUserRaw(ownerUserId);

    return {
      ...this.mapRoomResponse(room),
      _id: result.insertedId,
      owneruserid: ownerProfile,
    };
  }

  private async getRoomsCollection(): Promise<Collection<RoomDocument>> {
    if (this.roomsCollection) {
      return this.roomsCollection;
    }

    if (this.roomsCollectionPromise) {
      return this.roomsCollectionPromise;
    }

    this.roomsCollectionPromise = this.createRoomsCollection();
    try {
      this.roomsCollection = await this.roomsCollectionPromise;
      return this.roomsCollection;
    } finally {
      this.roomsCollectionPromise = null;
    }
  }

  private async createRoomsCollection(): Promise<Collection<RoomDocument>> {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      throw new InternalServerErrorException('MONGODB_URI is not configured');
    }

    const dbName = process.env.MONGODB_DB?.trim() || 'EMOCHAT';

    this.client = new MongoClient(uri);
    await this.client.connect();
    const db = this.client.db(dbName);
    this.roomsCollection = db.collection<RoomDocument>('rooms');

    await this.roomsCollection.createIndex({ roomid: 1 }, { unique: true });
    await this.roomsCollection.createIndex({ owneruserid: 1 });
    await this.roomsCollection.createIndex({ roomname: 1 });

    return this.roomsCollection;
  }

  private async getSeatStylesCollection(): Promise<Collection<SeatStyleDocument>> {
    if (this.seatStylesCollection) {
      return this.seatStylesCollection;
    }

    if (this.seatStylesCollectionPromise) {
      return this.seatStylesCollectionPromise;
    }

    this.seatStylesCollectionPromise = this.createSeatStylesCollection();
    try {
      this.seatStylesCollection = await this.seatStylesCollectionPromise;
      return this.seatStylesCollection;
    } finally {
      this.seatStylesCollectionPromise = null;
    }
  }

  private async createSeatStylesCollection(): Promise<Collection<SeatStyleDocument>> {
    if (!this.client) {
      const uri = process.env.MONGODB_URI?.trim();
      if (!uri) {
        throw new InternalServerErrorException('MONGODB_URI is not configured');
      }

      this.client = new MongoClient(uri);
      await this.client.connect();
    }

    const dbName = process.env.MONGODB_DB?.trim() || 'EMOCHAT';
    const db = this.client.db(dbName);
    this.seatStylesCollection = db.collection<SeatStyleDocument>('seat_styles');

    await this.seatStylesCollection.createIndex({ styleNumber: 1 }, { unique: true });

    return this.seatStylesCollection;
  }

  private mapRoomResponse(room: RoomDocument | WithId<RoomDocument>) {
    const response = {
      ownerid: room.ownerid,
      seatStyleReferenceId: room.seatStyleReferenceId,
      room_bg: room.room_bg,
      roomType: room.roomType,
      roomname: room.roomname,
      roombio: room.roombio,
      roomdp: room.roomdp,
      roomid: room.roomid,
      roomCountryCode: room.roomCountryCode,
      roomTag: room.roomTag,
      announcementMsg: room.announcementMsg,
      isSeatLock: room.isSeatLock,
      canVisitorsTakeMic: room.canVisitorsTakeMic,
      password: room.password,
      owneruserid: room.owneruserid,
      totalGifting: room.totalGifting,
      roomReward: room.roomReward,
      entranceFee: room.entranceFee,
      roomDynamicBackgroundModel: room.roomDynamicBackgroundModel,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };

    if ('_id' in room) {
      return {
        ...response,
        _id: room._id,
      };
    }

    return response;
  }

  private mapSeatStyleResponse(seatStyle: SeatStyleDocument) {
    return {
      styleNumber: seatStyle.styleNumber,
      totalSeats: seatStyle.totalSeats,
      seatImagePath: seatStyle.seatImagePath,
      hostEnable: seatStyle.hostEnable,
      hostSeatPath: seatStyle.hostSeatPath,
      free: seatStyle.free,
      price: seatStyle.price,
      createdAt: seatStyle.createdAt,
      updatedAt: seatStyle.updatedAt,
    };
  }

  private async resolveRoomName(ownerUserId: string) {
    const profile = await this.appAuthService.getProfile(ownerUserId);
    const userName = profile.user?.profile?.name ?? profile.user?.name;

    if (!userName?.trim()) {
      throw new BadRequestException('User name is required to create a room');
    }

    return userName.trim();
  }

  private normalizeRoomType(value: string | undefined) {
    if (value !== 'audio' && value !== 'video') {
      throw new BadRequestException('`roomType` must be `audio` or `video`');
    }

    return value;
  }

  private normalizeNullableString(value: string | null | undefined) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeNumber(value: number | undefined, fallback: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return value;
  }

  private normalizeRequiredString(value: string | undefined, message: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException(message);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(message);
    }

    return trimmed;
  }

  private normalizeBoolean(value: boolean | undefined, message: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(message);
    }

    return value;
  }

  private normalizeStyleNumber(value: number) {
    if (!Number.isInteger(value) || value < 0) {
      throw new BadRequestException('`styleNumber` must be a non-negative integer');
    }

    return value;
  }

  private normalizeTotalSeats(value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException('`totalSeats` must be a positive integer');
    }

    return value;
  }

  private normalizePrice(value: number) {
    if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
      throw new BadRequestException('`price` must be a non-negative number');
    }

    return value;
  }

  private async findRoomById(roomId: ObjectId) {
    const collection = await this.getRoomsCollection();
    const room = await collection.findOne({ _id: roomId });
    if (!room) {
      return null;
    }

    const owneruserid = await this.appAuthService.getUserRawByObjectId(room.owneruserid);
    const seatStyleReferenceId = await this.findSeatStyleById(room.seatStyleReferenceId);

    return {
      ...this.mapRoomResponse(room),
      owneruserid,
      seatStyleReferenceId,
    };
  }

  private async findSeatStyleById(seatStyleId: ObjectId) {
    const collection = await this.getSeatStylesCollection();
    const seatStyle = await collection.findOne({ _id: seatStyleId });
    if (!seatStyle) {
      return null;
    }

    return {
      ...this.mapSeatStyleResponse(seatStyle),
      _id: seatStyleId,
    };
  }

  private async findSeatStyleByStyleNumber(styleNumber: number) {
    const collection = await this.getSeatStylesCollection();
    return collection.findOne({ styleNumber });
  }
}
