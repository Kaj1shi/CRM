import {
  Body,
  Controller,
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
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './transactions.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get('summary')
  @Permissions(PERMISSIONS.TRANSACTIONS_VIEW)
  summary(@Query() query: TransactionQueryDto) {
    return this.transactions.summary(query);
  }

  @Get()
  @Permissions(PERMISSIONS.TRANSACTIONS_VIEW)
  list(@Query() query: TransactionQueryDto) {
    return this.transactions.list(query);
  }

  @Post()
  @Permissions(PERMISSIONS.TRANSACTIONS_CREATE)
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const transaction = await this.transactions.create(
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: transaction, message: 'Transaction successfully recorded.' };
  }

  @Get(':id')
  @Permissions(PERMISSIONS.TRANSACTIONS_VIEW)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.transactions.get(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.TRANSACTIONS_REVERSE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const transaction = await this.transactions.update(
      id,
      dto,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: transaction, message: 'Transaction updated.' };
  }

  @Post(':id/reverse')
  @Permissions(PERMISSIONS.TRANSACTIONS_REVERSE)
  async reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    const transaction = await this.transactions.reverse(
      id,
      user.id,
      request.ip,
      request.header('user-agent'),
    );
    return { data: transaction, message: 'Transaction reversed.' };
  }
}
