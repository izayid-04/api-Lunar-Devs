import { IsEnum, IsOptional } from 'class-validator';
import { MessageStatus } from '../message-status.enum.js';

export class ListMessagesQueryDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}
