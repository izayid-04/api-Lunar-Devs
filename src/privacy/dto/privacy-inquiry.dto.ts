import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrivacyInquiryStatus, PrivacyInquiryType } from '../entities/privacy-inquiry.entity.js';

export class CreatePrivacyInquiryDto {
  @IsEnum(PrivacyInquiryType)
  type!: PrivacyInquiryType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  description!: string;
}

export class UpdatePrivacyInquiryStatusDto {
  @IsEnum(PrivacyInquiryStatus)
  status!: PrivacyInquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  responseNote?: string;
}
