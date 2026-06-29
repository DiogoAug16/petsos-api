import { ForbiddenError } from "../errors/forbidden.error.js";
import { getUserRole } from "../utils/user-role.js";
import * as usersRepository from "../../modules/users/users.repository.js";

export function authorizeRoles(...allowedRoles) {
  return async (req, res, next) => {
    const user = await usersRepository.getUserById(req.userId);
    const role = getUserRole(user);

    if (!allowedRoles.includes(role)) {
      throw new ForbiddenError("Usuário sem permissão para acessar este recurso");
    }

    req.userRole = role;
    next();
  };
}
