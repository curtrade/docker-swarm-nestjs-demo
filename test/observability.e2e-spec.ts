import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hostname } from 'os';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Observability (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Этот e2e проверяет endpoint'ы наблюдаемости, а не персистентность.
    // Подменяем PrismaService заглушкой, чтобы тест не требовал живой БД.
    const prismaStub = {
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / возвращает hostname контейнера и версию', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200);
    expect(res.body.hostname).toBe(hostname());
    expect(typeof res.body.version).toBe('string');
    expect(res.body.version.length).toBeGreaterThan(0);
  });

  it('GET /health возвращает { status: "ok" }', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('считает ответы с ошибками: 400 валидации попадает в http_requests_total', async () => {
    // Пустое тело -> ValidationPipe бросает 400 (обработчик запущен -> интерсептор
    // отработал -> res "finish" зафиксировал статус ошибки).
    await request(app.getHttpServer()).post('/notes').send({}).expect(400);

    const res = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(res.text).toMatch(/http_requests_total\{[^}]*status="400"[^}]*\}/);
  });
});
