export const createTimer = () => {
  const startedAt = process.hrtime.bigint();
  return () => Number(process.hrtime.bigint() - startedAt) / 1_000_000;
};

export const roundDurationMs = (durationMs) => Number(durationMs.toFixed(1));

export const getEmailDomain = (email) => {
  if (typeof email !== "string") return null;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  return domain || null;
};

export const getErrorLogData = (error) => ({
  name: error?.name,
  code: error?.code,
  statusCode: error?.statusCode,
  message: error?.message,
});
