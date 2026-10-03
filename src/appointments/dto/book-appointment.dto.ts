import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class BookAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  requiredDocuments?: string;
}
