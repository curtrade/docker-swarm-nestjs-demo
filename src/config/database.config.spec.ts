import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildDatabaseUrl, DatabaseConfiguration, readSecretFile } from './database.config';

describe('readSecretFile', () => {
  it('читает и тримит содержимое файла-секрета', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sec-'));
    const file = join(dir, 'db_password');
    writeFileSync(file, 'topsecret\n');
    try {
      expect(readSecretFile(file)).toBe('topsecret');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('бросает понятную ошибку, если файла нет', () => {
    expect(() => readSecretFile('/no/such/secret')).toThrow(/Secret file not found/);
  });
});

describe('buildDatabaseUrl', () => {
  let dir: string;

  const make = (over: Partial<DatabaseConfiguration>): DatabaseConfiguration =>
    Object.assign(new DatabaseConfiguration(), {
      directUrl: '',
      host: 'postgres',
      port: 5432,
      user: 'app',
      name: 'appdb',
      passwordFile: '',
      passwordFromEnv: '',
      ...over,
    });

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'dbcfg-'));
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('directUrl имеет приоритет (локальная разработка)', () => {
    expect(buildDatabaseUrl(make({ directUrl: 'postgresql://local' }))).toBe('postgresql://local');
  });

  it('читает пароль из файла-секрета (приоритетнее env-пароля)', () => {
    const file = join(dir, 'pw');
    writeFileSync(file, 'fromfile\n');
    expect(buildDatabaseUrl(make({ passwordFile: file, passwordFromEnv: 'fromenv' }))).toBe(
      'postgresql://app:fromfile@postgres:5432/appdb?schema=public',
    );
  });

  it('использует env-пароль, если файл-секрет не задан', () => {
    expect(buildDatabaseUrl(make({ passwordFromEnv: 'envpw' }))).toBe(
      'postgresql://app:envpw@postgres:5432/appdb?schema=public',
    );
  });
});
