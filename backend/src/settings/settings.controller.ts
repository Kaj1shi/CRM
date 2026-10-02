import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsObject } from 'class-validator';
import {
  AppRequest,
  CurrentUser,
  Permissions,
  RequestUser,
} from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsObject()
  values!: Record<string, Prisma.InputJsonValue>;
}

@Controller('settings')
@Permissions(PERMISSIONS.SETTINGS_MANAGE)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll();
  }

  @Patch()
  async update(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const values = await this.settings.update(
      dto.values,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: values, message: 'Settings updated successfully.' };
  }
}
