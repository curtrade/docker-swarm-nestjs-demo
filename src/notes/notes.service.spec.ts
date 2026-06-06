import { NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import type { NotesRepository } from './notes.repository';

describe('NotesService', () => {
  const row = {
    id: 'abc',
    title: 'T',
    content: 'C',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const makeRepo = (over: Partial<Record<'create' | 'findMany' | 'findById', jest.Mock>> = {}) =>
    ({
      create: over.create ?? jest.fn(),
      findMany: over.findMany ?? jest.fn(),
      findById: over.findById ?? jest.fn(),
    }) as unknown as NotesRepository;

  it('create: сохраняет и возвращает NoteDto (без утечки Prisma-типа)', async () => {
    const repo = makeRepo({ create: jest.fn().mockResolvedValue(row) });
    const service = new NotesService(repo);

    const dto = await service.create({ title: 'T', content: 'C' });

    expect(repo.create).toHaveBeenCalledWith({ title: 'T', content: 'C' });
    expect(dto).toEqual({
      id: 'abc',
      title: 'T',
      content: 'C',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('findAll: возвращает список NoteDto', async () => {
    const repo = makeRepo({ findMany: jest.fn().mockResolvedValue([row]) });
    const service = new NotesService(repo);

    await expect(service.findAll()).resolves.toEqual([
      { id: 'abc', title: 'T', content: 'C', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('findOne: возвращает NoteDto, если запись найдена', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(row) });
    const service = new NotesService(repo);

    await expect(service.findOne('abc')).resolves.toMatchObject({ id: 'abc', title: 'T' });
  });

  it('findOne: бросает NotFoundException, если записи нет', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    const service = new NotesService(repo);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
