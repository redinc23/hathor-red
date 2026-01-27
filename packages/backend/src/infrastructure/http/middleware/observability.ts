import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { logger, metrics, tracer } from '../../lib/telemetry';

type RequestContext = {
  requestId: string;
  userId?: string;
  sessionId?: string;
};

type RequestWithContext = Request & {
  context?: RequestContext;
  user?: { id?: string };
  session?: { id?: string };
};

export const observabilityMiddleware = () => {
  return (req: RequestWithContext, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    const startTime = Date.now();

    req.context = {
      requestId,
      userId: req.user?.id,
      sessionId: req.session?.id
    };

    tracer.startSpan('http_request', {
      attributes: {
        'http.method': req.method,
        'http.route': req.path,
        'http.user_agent': req.get('user-agent')
      }
    });

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      metrics.httpRequestDuration.record(duration, {
        method: req.method,
        route: req.path,
        status_code: res.statusCode.toString()
      });

      logger.info('Request completed', {
        requestId,
        duration,
        status: res.statusCode,
        method: req.method,
        path: req.path
      });
    });

    next();
  };
};
