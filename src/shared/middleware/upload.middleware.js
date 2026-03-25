import multer from "multer";
import path from "path";

// configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// filtro de tipo de arquivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Apenas imagens JPG e PNG são permitidas"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
});
export default multer({ storage, fileFilter });
