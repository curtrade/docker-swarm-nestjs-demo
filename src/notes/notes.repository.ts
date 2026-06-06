import { Injectable } from '@nestjs/common';
import { Note } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateNoteData {
  title: string;
  content: string | null;
}

/**
 * Тонкий репозиторий: только обращения к Prisma, без бизнес-логики.
 * Единственный файл, который импортирует PrismaService для notes.
 */
@Injectable()
export class NotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNoteData): Promise<Note> {
    return this.prisma.note.create({ data });
  }

  findMany(): Promise<Note[]> {
    return this.prisma.note.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string): Promise<Note | null> {
    return this.prisma.note.findUnique({ where: { id } });
  }
}
