import { Note } from '@prisma/client';

/**
 * Публичный тип заметки — принадлежит приложению, а не Prisma.
 * Так изменения схемы БД не ломают молча контракт API и не светят внутренние поля.
 */
export interface NoteDto {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
}

/** Маппер на границе data-слоя: Prisma-модель -> публичный NoteDto. */
export function toNoteDto(note: Note): NoteDto {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
  };
}
