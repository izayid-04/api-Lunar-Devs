import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../user-role.enum.js';

export class AdminCreateUserDto {
  @IsEmail({}, { message: 'Format d’email invalide.' })
  @IsNotEmpty({ message: 'L’email est obligatoire.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères.' })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre majuscule et un chiffre.',
  })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(100)
  lastName!: string;

  @IsEnum(UserRole, { message: 'Rôle invalide.' })
  role!: UserRole;

  @IsOptional()
  @IsString()
  district?: string;
}
