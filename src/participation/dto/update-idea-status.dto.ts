import { IsEnum, IsOptional, IsString } from 'class-validator';
import { IdeaStatus } from '../entities/idea.entity.js';

export class UpdateIdeaStatusDto {
  @IsEnum(IdeaStatus)
  status!: IdeaStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
