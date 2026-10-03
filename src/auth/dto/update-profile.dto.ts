import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DISTRICTS } from '../../common/districts.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsIn(DISTRICTS)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredLanguage?: string;

  @IsOptional()
  @IsBoolean()
  isVulnerable?: boolean;
}
