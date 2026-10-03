import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAnnouncementDto {
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
  @MaxLength(100)
  category?: string;
}
