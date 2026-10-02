import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  AppRequest,
  CurrentUser,
  Permissions,
  RequestUser,
} from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { ClientDto, ClientQueryDto, ClientStatusDto } from './clients.dto';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get()
  @Permissions(PERMISSIONS.CLIENTS_VIEW)
  list(@Query() query: ClientQueryDto) {
    return this.clients.list(query);
  }

  @Post()
  @Permissions(PERMISSIONS.CLIENTS_CREATE)
  async create(
    @Body() dto: ClientDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const result = await this.clients.create(
      dto,
      user,
      request.ip,
      request.header('user-agent'),
    );
    return {
      data: result.client,
      warnings: result.warnings,
      message: 'Client successfully created.',
    };
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CLIENTS_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.get(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CLIENTS_EDIT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClientDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const client = await this.clients.update(
      id,
      dto,
      user,
      request.ip,
      request.header('user-agent'),
    );
    return { data: client, message: 'Client updated successfully.' };
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.CLIENTS_DEACTIVATE)
  async status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClientStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const client = await this.clients.setStatus(
      id,
      dto.status,
      user,
      request.ip,
      request.header('user-agent'),
    );
    return { data: client, message: 'Client status updated.' };
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CLIENTS_DEACTIVATE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const client = await this.clients.setStatus(
      id,
      'INACTIVE',
      user,
      request.ip,
      request.header('user-agent'),
    );
    return { data: client, message: 'Client deactivated.' };
  }

  @Get(':id/transactions')
  @Permissions(PERMISSIONS.CLIENTS_VIEW)
  transactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.clients.transactions(id, from, to);
  }

  @Get(':id/summary')
  @Permissions(PERMISSIONS.CLIENTS_VIEW)
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.clients.summary(id);
  }
}
