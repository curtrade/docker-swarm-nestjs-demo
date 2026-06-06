import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Считает каждый HTTP-запрос в метрику http_requests_total.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const method = req.method;

    // Слушаем 'finish': он срабатывает ПОСЛЕ отправки ответа — в том числе
    // после того, как exception-фильтр выставил статус. Поэтому считаем и
    // успешные, и ошибочные ответы (4xx/5xx) с корректным статусом.
    // tap() так не умеет — его next-колбэк не вызывается при ошибке.
    // once — чтобы не задвоить счёт.
    res.once('finish', () => {
      // Берём ШАБЛОН маршрута (например, /notes/:id) — ограниченная
      // кардинальность. Фолбэк — константа, а не сырой путь, иначе каждый
      // уникальный URL плодил бы новую серию меток (cardinality explosion).
      const route = (req.route as { path?: string } | undefined)?.path ?? 'unmatched';
      this.metrics.incRequest(method, route, res.statusCode);
    });

    return next.handle();
  }
}
