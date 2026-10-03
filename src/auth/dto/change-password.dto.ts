import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe actuel est requis.' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères.' })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins une lettre majuscule et un chiffre.',
  })
  newPassword!: string;
}
