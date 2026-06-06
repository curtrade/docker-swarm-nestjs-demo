import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Входной DTO создания заметки. Валидируется глобальным ValidationPipe. */
export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  content?: string;
}
