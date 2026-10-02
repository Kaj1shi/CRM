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
import { ProductDto, ProductQueryDto, ProductStatusDto } from './products.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @Permissions(PERMISSIONS.PRODUCTS_VIEW)
  list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }

  @Post()
  @Permissions(PERMISSIONS.PRODUCTS_CREATE)
  async create(
    @Body() dto: ProductDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const product = await this.products.create(
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: product, message: 'Product successfully created.' };
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.PRODUCTS_EDIT)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const product = await this.products.update(
      id,
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: product, message: 'Product updated successfully.' };
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.PRODUCTS_DEACTIVATE)
  async status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProductStatusDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const product = await this.products.setStatus(
      id,
      dto.status,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: product, message: 'Product status updated.' };
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PRODUCTS_DEACTIVATE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const product = await this.products.setStatus(
      id,
      'INACTIVE',
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: product, message: 'Product deactivated.' };
  }
}
