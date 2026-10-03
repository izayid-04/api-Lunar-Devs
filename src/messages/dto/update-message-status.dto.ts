import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessageStatus } from '../message-status.enum.js';

export class UpdateMessageStatusDto {
  @IsEnum(MessageStatus)
  status!: MessageStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
