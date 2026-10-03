import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;
}
