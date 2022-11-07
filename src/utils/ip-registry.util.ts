import type { TimeZone } from '@ipregistry/client';

import { secondsToHours } from './time.util';

export const ipRegistryTimeZone = (time_zone: TimeZone) => {
  return {
    id: time_zone.id,
    name: time_zone.name,
    symbol_abbreviation: time_zone.abbreviation,
    created_at: time_zone.current_time, // local timestamps
    offset: secondsToHours(time_zone.offset),
  };
};
