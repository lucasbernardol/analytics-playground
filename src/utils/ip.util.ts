import type { Request } from 'express';

export const ipSerializer = (ip_address: string): string => {
  return ip_address.includes('::') ? '127.0.0.1' : ip_address;
};

export const trackingIP = (request: Request) => {
  const ip_address = request.clientIp;

  return {
    ip_address: ipSerializer(ip_address as string),
  };
};
