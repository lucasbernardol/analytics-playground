import type { IpInfo } from '@ipregistry/client';

import { ipRegistryTimeZone } from '../utils/ip-registry.util';

export const ipRegistryParser = (data: IpInfo) => {
  return {
    ip: data.ip,
    ip_type: data.type,
    hostname: data.hostname,
    company: data.company,
    connection: data.connection,
    location: data.location,
    time_zone: ipRegistryTimeZone(data.time_zone),
  };
};
