import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe de confirmation est obligatoire.' })
  password!: string;
}
