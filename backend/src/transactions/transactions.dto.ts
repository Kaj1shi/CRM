import { ProductUnit, TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../common/dto/page-query.dto';

export class TransactionQueryDto extends PageQueryDto {
  @IsOptional() @IsEnum(TransactionType) transactionType?: TransactionType;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateTransactionDto {
  @IsEnum(TransactionType) transactionType!: TransactionType;
  @IsOptional() @IsUUID() clientId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsUUID() productId!: string;
  @Type(() => Number) @IsNumber() @Min(0.001) quantity!: number;
  @IsEnum(ProductUnit) unit!: ProductUnit;
  @IsDateString() transactionDate!: string;
  @IsOptional() @IsString() @MaxLength(80) referenceNumber?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional() @IsBoolean() acknowledgeLargeQuantity?: boolean;
}

export class UpdateTransactionDto {
  @IsOptional() @IsString() @MaxLength(80) referenceNumber?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
