import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_USER_KEY = 'allowPendingUser';

export const AllowPendingUser = () => SetMetadata(ALLOW_PENDING_USER_KEY, true);
