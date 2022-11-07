import { Request, Response, NextFunction } from 'express';

import { StatusCodes } from 'http-status-codes';

import { prisma } from '../lib/prisma';

import { hash } from '../utils/hash.util';
import { trackingIP } from '../utils/ip.util';
import { unix, now } from '../utils/time.util';

import { add as AnalyticsQueueAdd } from '../queue';

export class AbbreviationController {
  async all(request: Request, response: Response, next: NextFunction) {
    try {
      const abbreviations = await prisma.abbreviation.findMany({
        include: {
          definition: true,
        },
      });

      return response.status(StatusCodes.OK).json({ abbreviations });
    } catch (error) {
      return next(error); /** Error */
    }
  }

  async findById(request: Request, response: Response, next: NextFunction) {
    try {
      const { id } = request.params as { id: string };

      const abbreviation = await prisma.abbreviation.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          original_url: true,
          hash: true,
          redirectings: true,
          created_at: true,
          updated_at: true,
          definition: true,
          analytics: {
            include: {
              ip_address: {
                select: {
                  ip: true,
                  ip_type: true,
                },
              },
            },
            take: 10,
            orderBy: {
              created_at: 'desc',
            },
          },
        },
      });

      return response.status(StatusCodes.OK).json(abbreviation);
    } catch (error) {
      return next(error); /** Next stack with Errors */
    }
  }

  async count(request: Request, response: Response, next: NextFunction) {
    try {
      const { id } = request.params as { id: string };

      const total_analytics = await prisma.analytic.count({
        where: {
          abbreviation_id: id,
        },
      });

      return response.status(StatusCodes.OK).json({ total_analytics });
    } catch (error) {
      return next(error);
    }
  }

  async create(request: Request, response: Response, next: NextFunction) {
    try {
      const { original_url } = request.body as { original_url: string };

      const { ip_address } = trackingIP(request);

      const abbreviation = await prisma.abbreviation.create({
        data: {
          original_url,
          hash: hash(),
          ip_address,
          user_agent: request.tracking.user_agent,
          definition: {
            create: {
              tracking_at: unix(Date.now()),
            },
          },
        },
      });

      return response.status(StatusCodes.CREATED).json(abbreviation);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Handler/controller to redirecting and manage analytics
   *
   * @param request
   * @param response
   * @param next
   * @returns
   */
  async redirecting(request: Request, response: Response, next: NextFunction) {
    try {
      const { hash } = request.params as { hash: string };

      const { ip_address } = trackingIP(request);

      const tracking = request.tracking;

      const abbreviation = await prisma.abbreviation.findFirst({
        where: {
          hash,
        },
        select: {
          id: true,
          original_url: true,
          definition: {
            select: {
              tracking_at: true,
            },
          },
        },
      });

      /** Check if "abbreviations" exists */
      if (abbreviation?.id) {
        const abbreviation_id = abbreviation.id;

        await prisma.abbreviation.update({
          where: {
            hash,
          },
          data: {
            latest_at: now(),
            redirectings: {
              increment: 1,
            },
          },
          select: { id: true },
        });

        /** Add Analytics queue (check if enable)  */
        if (abbreviation.definition?.tracking_at /** truty */) {
          await AnalyticsQueueAdd({
            ip_address,
            abbreviation_id,
            tracking,
          });
        }

        // Redirecting to target
        return response.redirect(abbreviation.original_url);
      }

      /** Error */
      return response.status(StatusCodes.NOT_FOUND).end();
    } catch (error) {
      return next(error);
    }
  }

  async definitions(request: Request, response: Response, next: NextFunction) {
    try {
      const { id } = request.params as { id: string };

      const { tracking } = request.body as { tracking: boolean };

      //  Real project, sabe: "account_id", "abbreviation_id"
      //@ts-ignore
      const definition = await prisma.abbreviationDefinition.update({
        where: { abbreviation_id: id },
        data: {
          tracking_at: {
            set: tracking ? unix(Date.now()) : null,
          },
        },
      });

      return response.status(StatusCodes.OK).json(definition);
    } catch (error) {
      return next(error);
    }
  }
}
