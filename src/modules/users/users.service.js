import * as usersRepository from "./users.repository.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { deleteFiles } from "../../shared/helpers/file.helper.js";

const toPublicProfile = (profile) => ({
  name: profile.name ?? null,
  username: profile.username,
  description: profile.description ?? null,
  locationLabel: profile.locationLabel ?? null,
  photoUrl: profile.photoUrl ?? null,
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt,
});

const isLocalUploadPath = (path) => {
  return typeof path === "string" && path.startsWith("/uploads/");
};

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

export const updateCurrentProfile = async (
  userId,
  { name, description, locationLabel, photoUrl },
) => {
  const currentProfile = await usersRepository.getUserById(userId);

  if (!currentProfile) {
    throw new NotFoundError();
  }

  const updateData = {
    name,
    description: description || null,
    locationLabel: locationLabel || null,
  };

  if (photoUrl) {
    updateData.photoUrl = photoUrl;
  }

  const updatedProfile = await usersRepository.updateProfile(userId, updateData);

  if (
    photoUrl &&
    currentProfile.photoUrl !== photoUrl &&
    isLocalUploadPath(currentProfile.photoUrl)
  ) {
    await deleteFiles([currentProfile.photoUrl]);
  }

  return toPublicProfile(updatedProfile);
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

export const findNearestWithinRadius = async ({ lat, lng, radiusKm }) => {
  return await usersRepository.findNearestWithinRadius(lat, lng, radiusKm);
};
