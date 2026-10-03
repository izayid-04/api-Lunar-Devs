import { IsEnum, IsOptional } from 'class-validator';
import { MessageStatus } from '../message-status.enum.js';
import { MessageType } from '../message-type.enum.js';

export class ListMessagesQueryDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}
