import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TransportType } from '../entities/transport-line.entity.js';

export class ListTransportsQueryDto {
  @IsOptional()
  @IsEnum(TransportType)
  type?: TransportType;

  @IsOptional()
  @IsString()
  q?: string;
}

export class UpdateTransportStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  statusMessage?: string;
}
