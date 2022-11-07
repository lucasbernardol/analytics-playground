import { nanoid } from 'nanoid';

/**
 * NanoID hash
 */
export const hash = (length: number = 8): string => nanoid(length);
