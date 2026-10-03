import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCitizensQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
