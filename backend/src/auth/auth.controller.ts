import { randomBytes } from 'crypto';
import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import {
  AppRequest,
  CurrentUser,
  Public,
  RequestUser,
} from '../common/decorators';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';
import { ForgotPasswordDto, LoginDto, ResetPasswordDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('csrf')
  csrf(@Res({ passthrough: true }) response: Response) {
    const csrfToken = randomBytes(24).toString('hex');
    response.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { data: { csrfToken }, message: 'Security token issued.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(
      dto.email,
      dto.password,
      request.ip,
      request.header('user-agent'),
    );
    setAuthCookies(response, session.refreshToken, session.csrfToken);
    return {
      data: {
        accessToken: session.accessToken,
        csrfToken: session.csrfToken,
        user: session.user,
      },
      message: 'Signed in.',
    };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.refresh(
      request.cookies?.refresh_token as string | undefined,
      request.ip,
      request.header('user-agent'),
    );
    setAuthCookies(response, session.refreshToken, session.csrfToken);
    return {
      data: {
        accessToken: session.accessToken,
        csrfToken: session.csrfToken,
        user: session.user,
      },
      message: 'Session refreshed.',
    };
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.logout(
      request.cookies?.refresh_token as string | undefined,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    clearAuthCookies(response);
    return { data: result, message: 'Signed out.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgot(@Body() dto: ForgotPasswordDto) {
    const result = await this.auth.forgotPassword(dto.email);
    return {
      data: result,
      message:
        'If an account exists for that email, password reset instructions have been recorded.',
    };
  }

  @Public()
  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    const result = await this.auth.resetPassword(dto.token, dto.password);
    return { data: result, message: 'Password updated. Please sign in.' };
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }
}
