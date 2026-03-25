export const prepareComplaintData = (req, res, next) => {
  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  const parsedLocation =
    typeof req.body.location === 'string'
      ? JSON.parse(req.body.location)
      : req.body.location;

  req.validatedComplaintData = {
    ...req.body,
    location: parsedLocation,
    photos: photoPath ? [photoPath] : [],
  };

  next();
};
