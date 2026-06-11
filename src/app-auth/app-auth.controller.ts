import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AppAuthService } from './app-auth.service';
import { JwtBearerAuthGuard } from './jwt-bearer-auth.guard';

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

@Controller('app/auth')
export class AppAuthController {
  constructor(private readonly appAuthService: AppAuthService) {}

  @Post('google-login')
  async googleLogin(@Body() body: GoogleLoginRequest) {
    return this.appAuthService.googleLogin(body);
  }

  @UseGuards(JwtBearerAuthGuard)
  @Post('profile/complete')
  async completeProfile(@Req() req: any, @Body() body: ProfileCompleteRequest) {
    return this.appAuthService.completeProfile(req.user.sub, body);
  }

  @UseGuards(JwtBearerAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.appAuthService.getProfile(req.user.sub);
  }
}
