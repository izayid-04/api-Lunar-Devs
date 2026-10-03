import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateCitizenStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;
}
