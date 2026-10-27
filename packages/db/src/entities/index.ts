import { MentorInvitationSchema } from "./auth/mentor-invitation.entity";
import { UserRoleSchema } from "./auth/user-role.entity";
import { UserTokenSchema } from "./auth/user-token.entity";
import { UserSchema } from "./auth/user.entity";
import { TechnologySchema } from "./mentors/technology.entity";

/**
 * Wszystkie encje aplikacji. Każdą nową encję (zdefiniowaną przez `defineEntity`)
 * dopisz tutaj — z tej listy korzysta zarówno aplikacja, jak i CLI migracji.
 */
export const entities = [TechnologySchema, UserSchema, UserRoleSchema, UserTokenSchema, MentorInvitationSchema];

export { Technology } from "./mentors/technology.entity";
export { User, UserSchema } from "./auth/user.entity";
export { UserRole, UserRoleSchema } from "./auth/user-role.entity";
export { UserToken, UserTokenSchema } from "./auth/user-token.entity";
export { MentorInvitation, MentorInvitationSchema } from "./auth/mentor-invitation.entity";
