export const serialize = (id, data) => ({
  id,
  ...data,
  createdAt: data.createdAt.toDate().toISOString(),
  updatedAt: data.updatedAt.toDate().toISOString(),
});
