import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Превращает известные ошибки Prisma в аккуратные HTTP-ответы, не протекая
 * деталями БД (имена констрейнтов/колонок) наружу. Политика — в одном месте,
 * а не try/catch по сервисам.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    // Логируем исходную ошибку на стороне сервера (детали БД не уходят клиенту,
    // но видны в логах — помогает диагностике, см. главу 11).
    this.logger.warn(`Prisma error ${err.code}: ${err.message}`);

    switch (err.code) {
      case 'P2002': // нарушение уникальности
        res
          .status(HttpStatus.CONFLICT)
          .json(new ConflictException('Resource already exists').getResponse());
        return;
      case 'P2025': // запись не найдена
        res
          .status(HttpStatus.NOT_FOUND)
          .json(new NotFoundException('Resource not found').getResponse());
        return;
      case 'P2003': // нарушение внешнего ключа
        res
          .status(HttpStatus.BAD_REQUEST)
          .json(new BadRequestException('Related resource missing').getResponse());
        return;
      default:
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Database error' });
        return;
    }
  }
}
