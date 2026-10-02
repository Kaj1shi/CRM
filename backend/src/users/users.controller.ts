import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  AppRequest,
  CurrentUser,
  Permissions,
  RequestUser,
} from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { CreateUserDto, UpdateUserDto, UserStatusDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
@Permissions(PERMISSIONS.USERS_MANAGE)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const created = await this.users.create(
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: created, message: 'User successfully created.' };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const updated = await this.users.update(
      id,
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: updated, message: 'User updated successfully.' };
  }

  @Patch(':id/status')
  async status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const updated = await this.users.setStatus(
      id,
      dto.status,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: updated, message: 'User status updated.' };
  }
}
