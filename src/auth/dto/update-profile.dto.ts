import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { DISTRICTS } from '../../common/districts.js';

export class UpdateProfileDto {
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
