const _SECONDS_TO_HOURS_DIV = 60 * 60;
const _MILLISECONDS_DIVIDER = 1000;

export const secondsToHours = (seconds: number): number => {
  return Math.floor(seconds / _SECONDS_TO_HOURS_DIV);
};

export const unix = (milliseconds: number): number => {
  return Math.floor(milliseconds / _MILLISECONDS_DIVIDER);
};

export const now = () => new Date();
