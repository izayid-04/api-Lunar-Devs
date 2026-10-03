import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiRecommendationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  situation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetAudience?: string;
}
