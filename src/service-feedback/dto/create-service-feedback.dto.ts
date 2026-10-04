import { IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class CreateServiceFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  comment?: string;

  // F81 : Honeypot anti-spam
  @IsOptional()
  @IsString()
  website?: string;
}
