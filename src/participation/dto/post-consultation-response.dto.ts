import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class PostConsultationResponseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  option!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
