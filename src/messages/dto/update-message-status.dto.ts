import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MessageStatus } from '../message-status.enum.js';
import { MessagePriority } from '../message-priority.enum.js';

export class UpdateMessageStatusDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
