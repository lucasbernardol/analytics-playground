import type { Job, DoneCallback } from 'bull';

import { prisma } from '../lib/prisma';
import type { Tracking } from '../middlewares';

import { lookup } from '../lib/registry';

export type AnalyticsTaskItem = {
  abbreviation_id: string;
  ip_address: string;
  tracking: Tracking;
};

/**
 * @class AnalyticsTask
 */
class AnalyticsTask {
  static async process(job: Job<AnalyticsTaskItem>, callback: DoneCallback) {
    try {
      const { ip_address, abbreviation_id, tracking } = job.data;

      const {
        user_agent,
        browser_name,
        browser_version,
        //browser_major,
        engine_name,
        engine_version,
        device_type,
        device_model,
        device_vendor,
        os_name,
        os_version,
        cpu_architecture,
      } = tracking;

      /**
       * Get analytics
       */
      // @FIXME: fix IpV4 in production
      const registry = await lookup(process.env.IP as string);

      /**
       * - Check ip address
       */
      let ip_address_id: string;

      const address = await prisma.ipAddress.findFirst({
        select: {
          id: true,
        },
        where: {
          ip: ip_address,
        },
      });

      /** check if "address" exists */
      if (address?.id) {
        ip_address_id = address.id;
      } else {
        const _address = await prisma.ipAddress.create({
          data: {
            ip: ip_address,
            ip_type: registry.ip_type,
          },
        });

        ip_address_id = _address.id;
      }

      /**
       * Add analytics
       */
      const analytic = await prisma.analytic.create({
        data: {
          ip_address_id,
          hostname: registry.hostname,
          company: registry.company as any,
          connection: registry.connection as any,
          location: registry.location as any,
          time_zone: registry.time_zone,
          abbreviation_id,
          user_agent,
          browser_name,
          browser_version,
          engine_name,
          engine_version,
          device_type,
          device_model,
          device_vendor,
          os_name,
          os_version,
          cpu_architecture,
        },
        select: {
          id: true,
        },
      });

      const analytic_id = analytic.id;

      return callback(null, { ip_address_id, analytic_id, abbreviation_id });
    } catch (error: any) {
      return callback(error); /** Bull events/error */
    }
  }
}

export { AnalyticsTask };
