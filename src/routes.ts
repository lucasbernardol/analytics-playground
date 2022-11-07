import type { RequestHandler } from 'express';

import { Router } from 'express';
import { AbbreviationController } from './controllers/abbreviations.controller';

const routes = Router();

const controller = new AbbreviationController();

const adapt = (method: Function) => {
  const _adapter: RequestHandler = async (request, response, next) => {
    // Ignore context?
    await method(request, response, next);
  };

  return _adapter;
};

/** Redirectings */
routes.get('/r/:hash', adapt(controller.redirecting));

routes.get('/abbreviations', adapt(controller.all));
routes.get('/abbreviations/:id', adapt(controller.findById));
routes.get('/abbreviations/:id/analytics', adapt(controller.count));

routes.post('/abbreviations', adapt(controller.create));
routes.patch('/abbreviations/:id', adapt(controller.definitions));

export { routes };
