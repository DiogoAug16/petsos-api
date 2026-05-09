const GRAVITY = 1.5;
const AGE_OFFSET_HOURS = 2;

export const computeScore = ({ likes, createdAt, now = new Date() }) => {
  const createdAtDate = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  const ageInHours = Math.max(0, (now.getTime() - createdAtDate.getTime()) / 3_600_000);

  return likes / Math.pow(ageInHours + AGE_OFFSET_HOURS, GRAVITY);
};
