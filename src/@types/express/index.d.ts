import type { Tracking } from '../../middlewares';

declare global {
  namespace Express {
    export interface Request {
      tracking: Tracking;
    }
  }
}
