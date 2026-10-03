import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../user-role.enum.js';

export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: 'Rôle invalide.' })
  @IsNotEmpty({ message: 'Le rôle est obligatoire.' })
  role!: UserRole;
}
