import { complaintUpload, upload } from "../shared/middlewares/upload.middleware.js";
import { UPLOADS_DIR } from "../config/storage.js";
import { env } from "../config/env.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import { getDirectorySizeBytes } from "../shared/helpers/file.helper.js";
import logger from "../logger/index.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const PNG_SIGNATURE = "89504e470d0a1a0a";

const isJpeg = (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8;
const isPng = (buffer) => buffer.subarray(0, 8).toString("hex") === PNG_SIGNATURE;

const flattenFiles = (files) => {
  if (Array.isArray(files)) return files;
  if (!files || typeof files !== "object") return [];
  return Object.values(files).flat();
};

export const removeUploadedFiles = (files = []) => {
  for (const file of flattenFiles(files)) {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      logger.debug({ path: file.path, error: error.message }, "Erro ao remover upload");
    }
  }
};

const validateFileSignatures = (files = []) => {
  for (const file of files) {
    const buffer = fs.readFileSync(file.path);
    if (!isJpeg(buffer) && !isPng(buffer)) {
      removeUploadedFiles(files);
      throw new ValidationError("Imagem inválida", ERROR_CODES.UPLOAD_ERROR);
    }
  }
};

const enforceUploadQuota = (files = []) => {
  const uploadedFiles = flattenFiles(files);
  if (!uploadedFiles.length) return;

  const usedBytes = getDirectorySizeBytes(UPLOADS_DIR);
  if (usedBytes <= env.uploads.maxBytes) return;

  removeUploadedFiles(uploadedFiles);
  logger.warn(
    { usedBytes, maxBytes: env.uploads.maxBytes },
    "Limite de armazenamento de uploads atingido",
  );
  throw new ValidationError(
    "Limite de armazenamento de uploads atingido",
    ERROR_CODES.UPLOAD_ERROR,
  );
};

const createThumbnail = async (file) => {
  const parsedPath = path.parse(file.path);
  const filename = `${parsedPath.name}-thumb.jpg`;
  const thumbnailPath = path.join(parsedPath.dir, filename);

  await sharp(file.path)
    .rotate()
    .resize({
      width: 360,
      height: 360,
      fit: "cover",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 68 })
    .toFile(thumbnailPath);

  return {
    ...file,
    filename,
    path: thumbnailPath,
    mimetype: "image/jpeg",
    originalname: filename,
  };
};

const createThumbnails = async (files = []) => {
  if (!files.length) return [];
  const thumbnailFiles = [];
  try {
    for (const file of files) {
      thumbnailFiles.push(await createThumbnail(file));
    }
    return thumbnailFiles;
  } catch (error) {
    removeUploadedFiles([...files, ...thumbnailFiles]);
    logger.warn({ error: error.message }, "Erro ao gerar thumbnail");
    throw new ValidationError("Erro ao processar imagem", ERROR_CODES.UPLOAD_ERROR);
  }
};

export const validateUploadImage = (req, res, next) => {
  upload.array("photos", 5)(req, res, (err) => {
    if (err) {
      logger.warn({ error: err.message }, "Erro no upload de imagem");
      return next(
        new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR),
      );
    }

    try {
      validateFileSignatures(req.files);
      enforceUploadQuota(req.files);
      next();
    } catch (error) {
      next(error);
    }
  });
};

export const validateComplaintUploadImages = (req, res, next) => {
  complaintUpload.array("photos", 5)(req, res, async (err) => {
    if (err) {
      logger.warn({ error: err.message }, "Erro no upload de imagem");
      return next(
        new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR),
      );
    }

    try {
      const photos = flattenFiles(req.files);
      validateFileSignatures(photos);
      const thumbnailPhotos = await createThumbnails(photos);
      req.files = {
        photos,
        thumbnailPhotos,
      };
      enforceUploadQuota([...photos, ...thumbnailPhotos]);
      next();
    } catch (error) {
      next(error);
    }
  });
};
