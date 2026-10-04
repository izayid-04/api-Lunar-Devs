import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';
import { DISTRICTS, type District } from '../../common/districts.js';
import { MessageType, REPORT_CATEGORIES } from '../message-type.enum.js';

export function IsValidMessageCategory(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidMessageCategory',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as CreateMessageDto;
          if (typeof value !== 'string' || !value.trim()) return false;
          if (obj.type === MessageType.SIGNALEMENT) {
            return (REPORT_CATEGORIES as readonly string[]).includes(value);
          }
          return value.length <= 100;
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as CreateMessageDto;
          if (obj.type === MessageType.SIGNALEMENT) {
            return `Pour un signalement, la catégorie doit être parmi : ${REPORT_CATEGORIES.join(', ')}`;
          }
          return 'La catégorie doit être une chaîne valide de 100 caractères maximum';
        },
      },
    });
  };
}

export class CreateMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  body!: string;

  @IsValidMessageCategory()
  category!: string;

  @ValidateIf((o) => o.type === MessageType.SIGNALEMENT || o.district != null)
  @IsNotEmpty({ message: 'Pour un signalement, le quartier est obligatoire.' })
  @IsIn(DISTRICTS, {
    message: `Le quartier doit être parmi : ${DISTRICTS.join(', ')}`,
  })
  district?: District;

  @ValidateIf((o) => o.type === MessageType.SIGNALEMENT || o.preciseLocation != null)
  @IsNotEmpty({ message: 'Pour un signalement, le lieu précis est obligatoire.' })
  @IsString()
  @MaxLength(255)
  preciseLocation?: string;

  // F81 : Honeypot anti-spam
  @IsOptional()
  @IsString()
  website?: string;

  // F86 : Urgence médicale
  @IsOptional()
  isMedicalEmergency?: boolean;
}
