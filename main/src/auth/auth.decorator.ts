import { SetMetadata } from '@nestjs/common';

// set endpoint to be public useing the decorator @Public()
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
