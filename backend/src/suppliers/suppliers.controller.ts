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
import {
  SupplierDto,
  SupplierQueryDto,
  SupplierStatusDto,
} from './suppliers.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @Permissions(PERMISSIONS.SUPPLIERS_VIEW)
  list(@Query() query: SupplierQueryDto) {
    return this.suppliers.list(query);
  }

  @Post()
  @Permissions(PERMISSIONS.SUPPLIERS_CREATE)
  async create(
    @Body() dto: SupplierDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const result = await this.suppliers.create(
      dto,
      user,
      request.ip,
      request.header('user-agent'),
    );
    return {
      data: result.supplier,
      warnings: result.warnings,
      message: 'Supplier successfully created.',
    };
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SUPPLIERS_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.get(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.SUPPLIERS_EDIT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SupplierDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const supplier = await this.suppliers.update(
      id,
      dto,
      user,
      request.ip,
      request.header('user-agent'),
    );
    return { data: supplier, message: 'Supplier updated successfully.' };
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.SUPPLIERS_DEACTIVATE)
  async status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SupplierStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const supplier = await this.suppliers.setStatus(
      id,
      dto.status,
      user,
      request.ip,
      request.header('user-agent'),
    );
    return { data: supplier, message: 'Supplier status updated.' };
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.SUPPLIERS_DEACTIVATE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const supplier = await this.suppliers.setStatus(
      id,
      'INACTIVE',
      user,
      request.ip,
      request.header('user-agent'),
    );
    return { data: supplier, message: 'Supplier deactivated.' };
  }

  @Get(':id/transactions')
  @Permissions(PERMISSIONS.SUPPLIERS_VIEW)
  transactions(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.suppliers.transactions(id, from, to);
  }

  @Get(':id/summary')
  @Permissions(PERMISSIONS.SUPPLIERS_VIEW)
  summary(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.summary(id);
  }
}
