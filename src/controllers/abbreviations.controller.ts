import fileSystemPromises from 'node:fs/promises';
import { createWriteStream, stat } from 'node:fs';

import path from 'node:path';
import process from 'node:process';

import type { Abbreviation } from '@prisma/client';
import type { Request, Response, NextFunction, Errback } from 'express';

import { StatusCodes } from 'http-status-codes';
import { stringify } from 'csv-stringify';

import { prisma } from '../lib/prisma';
import { add as AnalyticsQueueAdd } from '../queue';

import { hash } from '../utils/hash.util';
import { trackingIP } from '../utils/ip.util';
import { unix, now } from '../utils/time.util';
import { raw } from '@prisma/client/runtime';

/**
 * Ideia/possible features
 *  analytics_tyes
 *    id
 *    type
 *      "TYPE_REDIRECT" | "TYPE_DOWNLOAD",
 *    created_at
 *    updated_at
 *
 *  abbreviation_definitions
 *    tracking_at (check if tracking/analytics is Enabled) - unix format
 *    download_at (check if download/csv is Enabled) - unix format
 *
 *  abbreviations
 *    download_at (last download timestamps)
 *    downloads (total downloads)
 *
 *  Using database/transactions with analytics job/task.
 *  version columns?
 */

enum FORMAT {
  JSON = 'json',
  CSV = 'csv',
  RAW = 'raw',
}

type Csv = {
  filename: string;
  path: string;
  size: number;
};

type HandleDownloader = (hash: string, data: Csv) => Errback;

const csv = async (abbreviation: Partial<Abbreviation>) => {
  type CallbackCsv = (error: Error | null, n?: Csv) => void;

  type CsvArray = Array<Partial<Abbreviation>>;

  const single = (array: CsvArray, callback: CallbackCsv) => {
    // No conflics file name
    const filename = `${Date.now()}.csv`;

    const tmpDirectory = path.resolve(process.cwd(), 'tmp', 'documents');

    const filepath = path.join(tmpDirectory, filename);

    const stream = stringify(array, {
      columns: {
        id: 'id',
        original_url: 'original',
        redirectings: 'redirectings',
        created_at: 'createdAt',
        updated_at: 'updatedAt',
      },
      header: true,
      quoted: true,
    });

    const writterStream = createWriteStream(filepath, {
      encoding: 'utf-8',
      flags: 'a+',
    });

    stream.pipe(writterStream); // pipe csv data

    writterStream.on('error', (error) => callback(error, null as any));

    writterStream.on('finish', () => {
      return callback(null, {
        filename,
        path: filepath,
        size: writterStream.bytesWritten,
      });
    });
  };

  return new Promise<Csv>((resolve, reject) => {
    return single([abbreviation], (error, data) => {
      return error ? reject(error) : resolve(data as Csv);
    });
  });
};

const plainText = (response: Response): Response => {
  response.setHeader('Content-Type', 'text/plain');

  return response;
};

/**
 * Check if file/directory exists
 */
const statAsync = (path: string): Promise<boolean> => {
  return new Promise<boolean>((resolve, reject) => {
    return stat(path, (error, _stats) => {
      return error ? resolve(false) : resolve(true);
    });
  });
};

const handleDownloader: HandleDownloader = (hash, data) => {
  const _callback: Errback = async (error) => {
    // @TODO: Add job/trask to remove file before download (with delay)
    const filepath = data?.path;

    if (error) {
      // Process error
    } else {
      /** Increments  */
      await prisma.abbreviation.update({
        where: { hash },
        data: {
          // rename to: redirects_at:
          latest_at: now(),
          redirectings: {
            increment: 1,
          },
          /*
            download_at: now(),
            downloads: { increment: 1 },
            _version: { increment: 1 },
          */
        },
      });

      const hasCsvDocumentInTmpDirectory = await statAsync(filepath);

      if (hasCsvDocumentInTmpDirectory) {
        await fileSystemPromises.unlink(filepath);
      }
    }
  };

  return _callback;
};

/**
 * @class AbbreviationController
 */
class AbbreviationController {
  async all(request: Request, response: Response, next: NextFunction) {
    try {
      const abbreviations = await prisma.abbreviation.findMany({
        include: {
          definition: true,
        },
      });

      return response.status(StatusCodes.OK).json({ abbreviations });
    } catch (error) {
      return next(error);
    }
  }

  async formats(request: Request, response: Response, next: NextFunction) {
    try {
      const { hash } = request.params as { hash: string };

      const query = request.query as { format?: string };

      const { ip_address } = trackingIP(request);

      const tracking = request.tracking;

      const abbreviation = await prisma.abbreviation.findFirst({
        where: {
          hash,
        },
        select: {
          id: true,
          original_url: true,
          redirectings: true,
          created_at: true,
          updated_at: true,
          definition: {
            select: {
              tracking_at: true,
            },
          },
        },
      });

      if (abbreviation?.id) {
        const abbreviation_id: string = abbreviation.id;

        const rawFormat = query?.format || 'raw';

        const format = rawFormat.toLowerCase();

        // prettier-ignore
        const {
          original_url, 
          redirectings, 
          created_at, 
          updated_at 
        } = abbreviation;

        /** JSON */
        if (format === FORMAT['JSON']) {
          // Update "redirectings"
          await prisma.abbreviation.update({
            where: { hash },
            data: {
              latest_at: now(),
              redirectings: {
                increment: 1,
              },
            },
          });

          /** Process analytics  */
          await AnalyticsQueueAdd({ abbreviation_id, ip_address, tracking });

          return response.status(StatusCodes.OK).json({ original_url });
        }

        /** CSV */
        if (format === FORMAT['CSV']) {
          const data = await csv({
            id: abbreviation_id,
            original_url,
            redirectings,
            created_at,
            updated_at,
          });

          //console.log(data);

          await AnalyticsQueueAdd({ abbreviation_id, ip_address, tracking });

          return response.download(data.path, handleDownloader(hash, data));
        }

        /** RAW */
        if (format === FORMAT['RAW']) {
          await prisma.abbreviation.update({
            where: { hash },
            data: {
              latest_at: now(),
              redirectings: {
                increment: 1,
              },
            },
          });

          /** Process analytics  */
          await AnalyticsQueueAdd({ abbreviation_id, ip_address, tracking });

          plainText(response);

          return response.status(StatusCodes.OK).send(original_url);
        }
      }

      return response.status(StatusCodes.NOT_FOUND).end();
    } catch (error) {
      return next(error);
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

export { AbbreviationController };
