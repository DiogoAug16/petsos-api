/**
 * Papéis disponíveis no sistema.
 *
 * admin:
 *   Administrador da plataforma.
 *
 * ong:
 *   Organização não governamental cadastrada.
 *
 * user:
 *   Usuário autenticado padrão.
 *
 * anonymous:
 *   Usuário não autenticado.
 */
export const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  ONG: "ong",
  USER: "user",
  ANONYMOUS: "anonymous",
});

export const DEFAULT_USER_ROLE = USER_ROLES.USER;
