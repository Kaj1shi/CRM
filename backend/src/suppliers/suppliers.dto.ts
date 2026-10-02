import { EntityStatus, SupplierType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../common/dto/page-query.dto';

export class SupplierQueryDto extends PageQueryDto {
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;

  @IsOptional()
  @IsString()
  frequency?: string;
}

export class SupplierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsEnum(SupplierType)
  supplierType?: SupplierType;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  confirmDuplicate?: boolean;
}

export class SupplierStatusDto {
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}
