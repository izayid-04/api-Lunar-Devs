import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { MessageStatus } from '../message-status.enum.js';
import { MessageType } from '../message-type.enum.js';

import { MessagePriority } from '../message-priority.enum.js';

export class ListMessagesQueryDto {
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @IsOptional()
  @IsIn(['recent', 'supports', 'priority'], {
    message: 'sort doit être parmi : recent, supports, priority',
  })
  sort?: 'recent' | 'supports' | 'priority';
}
