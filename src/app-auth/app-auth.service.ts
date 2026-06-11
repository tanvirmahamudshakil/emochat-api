/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Collection, MongoClient, ObjectId } from 'mongodb';

type GoogleTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
};

type GoogleLoginRequest = {
  token: string;
  androidDeviceId: string;
  ip: string;
  country: string;
};

type ProfileCompleteRequest = {
  coverPic?: string | null;
  profilePic?: string | null;
  name?: string | null;
  dateOfBirth?: string | null;
  country?: string | null;
  language?: string | null;
};

type AppUser = {
  googleSub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  audioRoomReferenceId: ObjectId | null;
  videoRoomReferenceId: ObjectId | null;
  profile: {
    coverPic: string | null;
    profilePic: string | null;
    name: string | null;
    dateOfBirth: string | null;
    country: string | null;
    language: string | null;
    profileCompleted: boolean;
    updatedAt: Date | null;
  };
  loginMeta: {
    androidDeviceId: string;
    ip: string;
    country: string;
    at: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
};

@Injectable()
export class AppAuthService {
  private client: MongoClient | null = null;
  private usersCollection: Collection<AppUser> | null = null;
  private usersCollectionPromise: Promise<Collection<AppUser>> | null = null;
  constructor(private readonly jwtService: JwtService) {}

  async googleLogin(payload: GoogleLoginRequest) {
    this.validatePayload(payload);

    const tokenInfo = await this.verifyGoogleIdToken(payload.token);
    const googleSub = tokenInfo.sub;
    if (!googleSub) {
      throw new UnauthorizedException('Invalid Google token: missing subject');
    }

    const collection = await this.getUsersCollection();
    const now = new Date();
    const loginMeta = {
      androidDeviceId: payload.androidDeviceId,
      ip: payload.ip,
      country: payload.country,
      at: now,
    };

    const existing = await collection.findOne({ googleSub });

    if (!existing) {
      const newUser: AppUser = {
        googleSub,
        email: tokenInfo.email ?? null,
        emailVerified: tokenInfo.email_verified === 'true',
        name: tokenInfo.name ?? null,
        picture: tokenInfo.picture ?? null,
        audioRoomReferenceId: null,
        videoRoomReferenceId: null,
        profile: {
          coverPic: null,
          profilePic: tokenInfo.picture ?? null,
          name: tokenInfo.name ?? null,
          dateOfBirth: null,
          country: payload.country,
          language: null,
          profileCompleted: false,
          updatedAt: null,
        },
        loginMeta,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      await collection.insertOne(newUser);

      const accessToken = await this.issueAccessToken(newUser);
      return {
        isNewUser: true,
        message: 'User created and logged in',
        tokenType: 'Bearer',
        accessToken,
        user: await this.mapUserResponse(newUser),
      };
    }

    const updatedUser = {
      ...existing,
      email: tokenInfo.email ?? existing.email,
      emailVerified: tokenInfo.email_verified === 'true',
      name: tokenInfo.name ?? existing.name,
      picture: tokenInfo.picture ?? existing.picture,
      profile: {
        ...(existing.profile ?? {
          coverPic: null,
          profilePic: null,
          name: null,
          dateOfBirth: null,
          country: null,
          language: null,
          profileCompleted: false,
          updatedAt: null,
        }),
        profilePic:
          existing.profile?.profilePic ?? tokenInfo.picture ?? existing.picture,
        name: existing.profile?.name ?? tokenInfo.name ?? existing.name,
        country: existing.profile?.country ?? payload.country,
      },
      loginMeta,
      updatedAt: now,
      lastLoginAt: now,
    };

    await collection.updateOne(
      { googleSub },
      {
        $set: {
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
          name: updatedUser.name,
          picture: updatedUser.picture,
          profile: updatedUser.profile,
          loginMeta: updatedUser.loginMeta,
          updatedAt: updatedUser.updatedAt,
          lastLoginAt: updatedUser.lastLoginAt,
        },
      },
    );

    const accessToken = await this.issueAccessToken(updatedUser);
    return {
      isNewUser: false,
      message: 'User logged in',
      tokenType: 'Bearer',
      accessToken,
      user: await this.mapUserResponse(updatedUser),
    };
  }

  async completeProfile(googleSub: string, payload: ProfileCompleteRequest) {
    if (!googleSub?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const collection = await this.getUsersCollection();
    const existing = await collection.findOne({ googleSub });
    if (!existing) {
      throw new UnauthorizedException('User not found');
    }

    const now = new Date();
    const profile = {
      coverPic: this.normalizeNullableString(
        payload.coverPic ?? existing.profile?.coverPic ?? null,
      ),
      profilePic: this.normalizeNullableString(
        payload.profilePic ?? existing.profile?.profilePic ?? existing.picture,
      ),
      name: this.normalizeNullableString(
        payload.name ?? existing.profile?.name ?? existing.name,
      ),
      dateOfBirth: this.normalizeNullableString(
        payload.dateOfBirth ?? existing.profile?.dateOfBirth ?? null,
      ),
      country: this.normalizeNullableString(
        payload.country ?? existing.profile?.country ?? existing.loginMeta.country,
      ),
      language: this.normalizeNullableString(
        payload.language ?? existing.profile?.language ?? null,
      ),
      profileCompleted: true,
      updatedAt: now,
    };

    const updatedUser: AppUser = {
      ...existing,
      name: profile.name ?? existing.name,
      picture: profile.profilePic ?? existing.picture,
      profile,
      updatedAt: now,
    };

    await collection.updateOne(
      { googleSub },
      {
        $set: {
          name: updatedUser.name,
          picture: updatedUser.picture,
          profile: updatedUser.profile,
          updatedAt: updatedUser.updatedAt,
        },
      },
    );

    return {
      message: 'Profile completed successfully',
      profileCompleted: true,
      user: await this.mapUserResponse(updatedUser),
    };
  }

  async getProfile(googleSub: string) {
    if (!googleSub?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const collection = await this.getUsersCollection();
    const user = await collection.findOne({ googleSub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: await this.mapUserResponse(user),
    };
  }

  async getUserRaw(googleSub: string) {
    if (!googleSub?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const collection = await this.getUsersCollection();
    const user = await collection.findOne({ googleSub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getUserObjectId(googleSub: string) {
    if (!googleSub?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    const collection = await this.getUsersCollection();
    const user = await collection.findOne({ googleSub });
    if (!user?._id) {
      throw new UnauthorizedException('User not found');
    }

    return user._id;
  }

  async getUserRawByObjectId(userId: ObjectId) {
    if (!(userId instanceof ObjectId)) {
      throw new UnauthorizedException('User not found');
    }

    const collection = await this.getUsersCollection();
    const user = await collection.findOne({ _id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async setRoomReferenceId(
    googleSub: string,
    roomType: 'audio' | 'video',
    roomReferenceId: ObjectId,
  ) {
    if (!googleSub?.trim()) {
      throw new UnauthorizedException('Unauthorized');
    }

    if (!(roomReferenceId instanceof ObjectId)) {
      throw new BadRequestException('`roomReferenceId` is required');
    }

    const collection = await this.getUsersCollection();
    const existing = await collection.findOne({ googleSub });
    if (!existing) {
      throw new UnauthorizedException('User not found');
    }

    const now = new Date();
    const updatedUser: AppUser = {
      ...existing,
      profile: {
        ...(existing.profile ?? {
          coverPic: null,
          profilePic: null,
          name: null,
          dateOfBirth: null,
          country: null,
          language: null,
          profileCompleted: false,
          updatedAt: null,
        }),
        updatedAt: now,
      },
      audioRoomReferenceId:
        roomType === 'audio'
          ? roomReferenceId
          : existing.audioRoomReferenceId ?? (existing as any).profile?.audioRoomReferenceId ?? null,
      videoRoomReferenceId:
        roomType === 'video'
          ? roomReferenceId
          : existing.videoRoomReferenceId ?? (existing as any).profile?.videoRoomReferenceId ?? null,
      updatedAt: now,
    };

    await collection.updateOne(
      { googleSub },
      {
        $set: {
          audioRoomReferenceId: updatedUser.audioRoomReferenceId,
          videoRoomReferenceId: updatedUser.videoRoomReferenceId,
          updatedAt: updatedUser.updatedAt,
        },
      },
    );

    return {
      message: 'Room reference updated successfully',
      user: await this.mapUserResponse(updatedUser),
    };
  }

  private validatePayload(payload: GoogleLoginRequest) {
    if (!payload?.token?.trim()) {
      throw new BadRequestException('`token` is required');
    }
    if (!payload?.androidDeviceId?.trim()) {
      throw new BadRequestException('`androidDeviceId` is required');
    }
    if (!payload?.ip?.trim()) {
      throw new BadRequestException('`ip` is required');
    }
    if (!payload?.country?.trim()) {
      throw new BadRequestException('`country` is required');
    }
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const tokenInfo = (await response.json()) as GoogleTokenInfo;
    const expectedAud = process.env.GOOGLE_CLIENT_ID?.trim();

    if (expectedAud && tokenInfo.aud !== expectedAud) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    return tokenInfo;
  }

  private async getUsersCollection(): Promise<Collection<AppUser>> {
    if (this.usersCollection) {
      return this.usersCollection;
    }

    if (this.usersCollectionPromise) {
      return this.usersCollectionPromise;
    }

    this.usersCollectionPromise = this.createUsersCollection();
    try {
      this.usersCollection = await this.usersCollectionPromise;
      return this.usersCollection;
    } finally {
      this.usersCollectionPromise = null;
    }
  }

  private async getRoomsCollection(): Promise<Collection<any>> {
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
    return db.collection('rooms');
  }

  private async createUsersCollection(): Promise<Collection<AppUser>> {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) {
      throw new InternalServerErrorException('MONGODB_URI is not configured');
    }

    const dbName = process.env.MONGODB_DB?.trim() || 'EMOCHAT';

    this.client = new MongoClient(uri);
    await this.client.connect();
    const db = this.client.db(dbName);
    this.usersCollection = db.collection<AppUser>('app_users');

    await this.usersCollection.createIndex({ googleSub: 1 }, { unique: true });
    await this.usersCollection.createIndex({ email: 1 });

    return this.usersCollection;
  }

  private async mapUserResponse(user: AppUser) {
    const audioRoomReferenceId =
      user.audioRoomReferenceId ?? (user as any).profile?.audioRoomReferenceId ?? null;
    const videoRoomReferenceId =
      user.videoRoomReferenceId ?? (user as any).profile?.videoRoomReferenceId ?? null;

    return {
      googleSub: user.googleSub,
      email: user.email,
      emailVerified: user.emailVerified,
      name: user.name,
      picture: user.picture,
      profile: user.profile,
      androidDeviceId: user.loginMeta.androidDeviceId,
      ip: user.loginMeta.ip,
      country: user.loginMeta.country,
      audioRoomReferenceId: audioRoomReferenceId
        ? await this.populateRoomById(audioRoomReferenceId)
        : null,
      videoRoomReferenceId: videoRoomReferenceId
        ? await this.populateRoomById(videoRoomReferenceId)
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async populateRoomById(roomId: ObjectId) {
    const roomsCollection = await this.getRoomsCollection();
    return roomsCollection.findOne({ _id: roomId });
  }

  private async issueAccessToken(user: AppUser): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.googleSub,
      email: user.email,
      name: user.name,
    });
  }

  private normalizeNullableString(value: string | null | undefined) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
