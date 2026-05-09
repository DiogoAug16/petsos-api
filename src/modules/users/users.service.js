import * as usersRepository from "./users.repository.js";

export const getUidByUsername = async (username) => {
  return await usersRepository.getUidByUsername(username);
};

export const getUsernamesByIds = async (uids) => {
  return await usersRepository.getUsersByIds(uids);
};

export const enrichWithUsernames = async (items) => {
  if (items.length === 0) return [];

  const userIds = items.map((item) => item.userId).filter(Boolean);
  const usersById = await getUsernamesByIds(userIds);

  return items.map((item) => ({
    ...item,
    username: usersById.get(item.userId) ?? null,
  }));
};

export const enrichWithUsername = async (item) => {
  const [enriched] = await enrichWithUsernames([item]);
  return enriched;
};

export const enrichWithCreatedByUsernames = async (items) => {
  if (items.length === 0) return [];

  const userIds = items.map((item) => item.createdById).filter(Boolean);
  const usersById = await getUsernamesByIds(userIds);

  return items.map((item) => ({
    ...item,
    createdByUsername: usersById.get(item.createdById) ?? null,
  }));
};

export const enrichWithCreatedByUsername = async (item) => {
  const [enriched] = await enrichWithCreatedByUsernames([item]);
  return enriched;
};
