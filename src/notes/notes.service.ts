import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteDto, toNoteDto } from './dto/note.dto';
import { NotesRepository } from './notes.repository';

/**
 * Бизнес-логика заметок: оркестрация репозитория и маппинг на публичный NoteDto.
 * Не пропускает Prisma-типы наружу.
 */
@Injectable()
export class NotesService {
  constructor(private readonly repo: NotesRepository) {}

  async create(dto: CreateNoteDto): Promise<NoteDto> {
    const note = await this.repo.create({ title: dto.title, content: dto.content ?? null });
    return toNoteDto(note);
  }

  async findAll(): Promise<NoteDto[]> {
    const notes = await this.repo.findMany();
    return notes.map(toNoteDto);
  }

  async findOne(id: string): Promise<NoteDto> {
    const note = await this.repo.findById(id);
    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }
    return toNoteDto(note);
  }
}
