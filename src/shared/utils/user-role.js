import { DEFAULT_USER_ROLE, USER_ROLES } from "../constants/user-roles.js";

const VALID_ROLES = Object.values(USER_ROLES);

export function getUserRole(user) {
  if (!user?.role) {
    return DEFAULT_USER_ROLE;
  }

  if (!VALID_ROLES.includes(user.role)) {
    return DEFAULT_USER_ROLE;
  }

  return user.role;
}
