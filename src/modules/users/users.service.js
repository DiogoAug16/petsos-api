import * as usersRepository from "./users.repository.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";

const toPublicProfile = (profile) => ({
  name: profile.name ?? null,
  username: profile.username,
  createdAt: profile.createdAt,
});

export const getUidByUsername = async (username) => {
  return await usersRepository.getUidByUsername(username);
};

export const getPublicProfileByUsername = async (username) => {
  const profile = await usersRepository.getUserByUsername(username);

  if (!profile) {
    throw new NotFoundError();
  }

  return toPublicProfile(profile);
};

export const getPublicProfileById = async (userId) => {
  const profile = await usersRepository.getUserById(userId);

  if (!profile) {
    throw new NotFoundError();
  }

  return toPublicProfile(profile);
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
