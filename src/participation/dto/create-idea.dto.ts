import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  district?: string;
}
