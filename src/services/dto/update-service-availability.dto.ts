import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ServiceAvailability } from '../service-availability.enum.js';

export class UpdateServiceAvailabilityDto {
  @IsEnum(ServiceAvailability)
  availability!: ServiceAvailability;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  availabilityMessage?: string;

  @IsOptional()
  @IsDateString()
  availableAgainAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  alternative?: string;
}
