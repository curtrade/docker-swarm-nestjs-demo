import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteDto } from './dto/note.dto';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Post()
  create(@Body() dto: CreateNoteDto): Promise<NoteDto> {
    return this.notes.create(dto);
  }

  @Get()
  findAll(): Promise<NoteDto[]> {
    return this.notes.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<NoteDto> {
    return this.notes.findOne(id);
  }
}
