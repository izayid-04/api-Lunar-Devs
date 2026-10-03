import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DISTRICTS, type District } from '../../common/districts.js';
import { AlertSeverity, AlertTarget } from '../alert-enums.js';

export class CreateAlertDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsEnum(AlertTarget)
  target!: AlertTarget;

  @ValidateIf((o: CreateAlertDto) => o.target === AlertTarget.DISTRICT)
  @IsNotEmpty({ message: 'targetDistrict is required when target is district' })
  @IsIn(DISTRICTS, {
    message: `targetDistrict must be one of: ${DISTRICTS.join(', ')}`,
  })
  targetDistrict?: District;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
