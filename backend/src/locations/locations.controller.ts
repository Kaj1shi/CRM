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
import { LocationDto } from './locations.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @Permissions(PERMISSIONS.CLIENTS_VIEW)
  list() {
    return this.locations.list();
  }

  @Post()
  @Permissions(PERMISSIONS.CLIENTS_CREATE)
  async create(
    @Body() dto: LocationDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const location = await this.locations.create(
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: location, message: 'Location successfully created.' };
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CLIENTS_EDIT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LocationDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const location = await this.locations.update(
      id,
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: location, message: 'Location updated successfully.' };
  }
}
