import { SetMetadata } from '@nestjs/common';

import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: string[]): ClassDecorator & MethodDecorator =>
  SetMetadata(ROLES_KEY, roles);
