import { EntityStatus, ProductCategory, ProductUnit } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../common/dto/page-query.dto';

export class ProductQueryDto extends PageQueryDto {
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;
}

export class ProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsEnum(ProductCategory)
  category!: ProductCategory;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}

export class ProductStatusDto {
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}
