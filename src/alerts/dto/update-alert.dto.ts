import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DISTRICTS, type District } from '../../common/districts.js';
import { AlertSeverity, AlertTarget } from '../alert-enums.js';

export class UpdateAlertDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsEnum(AlertTarget)
  target?: AlertTarget;

  @ValidateIf((o: UpdateAlertDto) => o.target === AlertTarget.DISTRICT)
  @IsOptional()
  @IsIn(DISTRICTS, {
    message: `targetDistrict must be one of: ${DISTRICTS.join(', ')}`,
  })
  targetDistrict?: District;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
