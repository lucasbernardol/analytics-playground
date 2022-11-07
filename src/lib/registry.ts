import {
  IpregistryClient,
  InMemoryCache,
  IpregistryOptions,
} from '@ipregistry/client';

import { ipRegistryParser } from './ip-registry.transform';

const client = new IpregistryClient(
  process.env.IP_REGISTRY_SECRET as string,
  new InMemoryCache(100)
);

const _FILTER: string[] = [
  '-carrier',
  '-user_agent',
  '-currency.format',
  '-location.country.borders',
  '-location.country.flag.nato',
  '-time_zone.in_daylight_saving',
];

const ipRegistryfilter = (): string => {
  const SERAPATOR = ',';

  return _FILTER.join(SERAPATOR);
};

export const lookup = async (ip_address: string) => {
  const lookup = await client.lookup(
    ip_address,
    IpregistryOptions.filter(ipRegistryfilter()),
    IpregistryOptions.hostname(true)
  );

  console.log('__isCacheble__', lookup.credits.remaining);

  return ipRegistryParser(lookup.data);
};
