import { IsEnum } from 'class-validator';
import { MessageStatus } from '../message-status.enum.js';

export class UpdateMessageStatusDto {
  @IsEnum(MessageStatus)
  status!: MessageStatus;
}
