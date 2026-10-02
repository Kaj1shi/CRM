import { Controller, Get, Query, Req } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  AppRequest,
  CurrentUser,
  Permissions,
  RequestUser,
} from '../common/decorators';
import { PERMISSIONS } from '../common/permissions';
import { ReportsService } from './reports.service';

class ReportQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional()
  @IsIn(['CLIENT_PURCHASE', 'SUPPLIER_SUPPLY'])
  transactionType?: TransactionType;
  @IsOptional() @IsIn(['csv', 'xlsx', 'pdf']) format?: string;
}
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('clients') @Permissions(PERMISSIONS.REPORTS_OPERATIONAL) clients(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    return this.reports.clients(
      query,
      user,
      request.ip,
      request.header('user-agent'),
    );
  }
  @Get('suppliers') @Permissions(PERMISSIONS.REPORTS_OPERATIONAL) suppliers(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    return this.reports.suppliers(
      query,
      user,
      request.ip,
      request.header('user-agent'),
    );
  }
  @Get('transactions')
  @Permissions(PERMISSIONS.REPORTS_OPERATIONAL)
  transactions(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    return this.reports.transactions(
      query,
      user,
      request.ip,
      request.header('user-agent'),
    );
  }
  @Get('quantities') @Permissions(PERMISSIONS.REPORTS_MANAGEMENT) quantities(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    return this.reports.quantities(
      query,
      user,
      request.ip,
      request.header('user-agent'),
    );
  }
  @Get('purchasing') @Permissions(PERMISSIONS.REPORTS_MANAGEMENT) purchasing(
    @Query() query: ReportQueryDto,
    @CurrentUser() user: RequestUser,
    @Req() request: AppRequest,
  ) {
    return this.reports.purchasing(
      query,
      user,
      request.ip,
      request.header('user-agent'),
    );
  }
}
