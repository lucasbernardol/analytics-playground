import type { RequestHandler } from 'express';

import parser from 'ua-parser-js';

export type Tracking = {
  user_agent: string | undefined;
  browser_name: string | undefined;
  browser_version: string | undefined;
  browser_major: string | undefined;
  engine_name: string | undefined;
  engine_version: string | undefined;
  os_name: string | undefined;
  os_version: string | undefined;
  device_type: string | undefined;
  device_model: string | undefined;
  device_vendor: string | undefined;
  cpu_architecture: string | undefined;
};

export class Middlewares {
  static agent(): RequestHandler {
    const _UNKNOWN_AGENT: string = 'unknown';

    function tracking(
      ua: string,
      callback: (error: Error | null, r?: any) => void
    ) {
      try {
        const userAgent = parser(ua ?? _UNKNOWN_AGENT);

        return callback(null, {
          user_agent: userAgent?.ua,
          browser_name: userAgent.browser?.name,
          browser_version: userAgent.browser?.version,
          browser_major: userAgent.browser?.major,
          engine_name: userAgent.engine?.name,
          engine_version: userAgent.engine?.version,
          device_type: userAgent.device?.type,
          device_model: userAgent.device?.model,
          device_vendor: userAgent.device?.vendor,
          os_name: userAgent.os?.name,
          os_version: userAgent.os?.version,
          cpu_architecture: userAgent.cpu?.architecture,
        });
      } catch (error) {
        // Next call stack
        return callback(error as Error);
      }
    }

    const _tracking = async (ua: string): Promise<Tracking> => {
      return new Promise((resolve, reject) => {
        return tracking(ua, (error, ua) => {
          return error ? reject(error) : resolve(ua);
        });
      });
    };

    const handle: RequestHandler = async (request, response, next) => {
      const userAgentHeader = request.get('user-agent');

      const track = await _tracking(userAgentHeader as string);

      request.tracking = track;

      return next();
    };

    return handle;
  }
}
