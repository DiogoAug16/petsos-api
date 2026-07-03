export const COMPLAINT_PUBLIC_VISIBILITY = {
  VISIBLE: "visible",
  HIDDEN: "hidden",
};

export const VALID_COMPLAINT_PUBLIC_VISIBILITY = Object.values(
  COMPLAINT_PUBLIC_VISIBILITY,
);

export const isComplaintPubliclyVisible = (complaint) =>
  complaint?.publicVisibility == null ||
  complaint.publicVisibility === COMPLAINT_PUBLIC_VISIBILITY.VISIBLE;
