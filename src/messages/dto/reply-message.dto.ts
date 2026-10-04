import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @IsNotEmpty()
  message!: string;
}
