import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;
}
