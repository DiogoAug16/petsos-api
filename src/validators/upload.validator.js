import { complaintUpload, upload } from "../shared/middlewares/upload.middleware.js";
import { UPLOADS_DIR } from "../config/storage.js";
import { env } from "../config/env.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import { getDirectorySizeBytesAsync } from "../shared/helpers/file.helper.js";
import logger from "../logger/index.js";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const PNG_SIGNATURE = "89504e470d0a1a0a";
const UPLOAD_USAGE_CACHE_TTL_MS = 60 * 1000;
const IMAGE_SIGNATURE_BYTES = 8;
const THUMBNAIL_CONCURRENCY = 2;

let uploadUsageCache = {
  bytes: null,
  expiresAt: 0,
};

const isJpeg = (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8;
const isPng = (buffer) => buffer.subarray(0, 8).toString("hex") === PNG_SIGNATURE;

const flattenFiles = (files) => {
  if (Array.isArray(files)) return files;
  if (!files || typeof files !== "object") return [];
  return Object.values(files).flat();
};

export const removeUploadedFiles = (files = []) => {
  for (const file of flattenFiles(files)) {
    fs.promises.unlink(file.path).catch((error) => {
      logger.debug({ path: file.path, error: error.message }, "Erro ao remover upload");
    });
  }
};

const readSignature = async (filePath) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(IMAGE_SIGNATURE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, IMAGE_SIGNATURE_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
};

const validateFileSignatures = async (files = []) => {
  for (const file of files) {
    const buffer = await readSignature(file.path);
    if (!isJpeg(buffer) && !isPng(buffer)) {
      removeUploadedFiles(files);
      throw new ValidationError("Imagem inválida", ERROR_CODES.UPLOAD_ERROR);
    }
  }
};

const getUploadedFilesSizeBytes = async (files = []) => {
  const sizes = await Promise.all(
    flattenFiles(files).map(async (file) => {
      try {
        const stats = await fs.promises.stat(file.path);
        return stats.size;
      } catch {
        return 0;
      }
    }),
  );

  return sizes.reduce((total, size) => total + size, 0);
};

const runWithConcurrency = async (items, concurrency, worker) => {
  const results = [];
  let firstError = null;
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        try {
          results[index] = await worker(items[index]);
        } catch (error) {
          firstError = firstError || error;
        }
      }
    },
  );

  await Promise.all(workers);
  if (firstError) {
    firstError.results = results.filter(Boolean);
    throw firstError;
  }

  return results;
};

const getUploadUsage = async () => {
  const now = Date.now();
  if (uploadUsageCache.bytes !== null && uploadUsageCache.expiresAt > now) {
    return { bytes: uploadUsageCache.bytes, fromCache: true };
  }

  const bytes = await getDirectorySizeBytesAsync(UPLOADS_DIR);
  uploadUsageCache = {
    bytes,
    expiresAt: now + UPLOAD_USAGE_CACHE_TTL_MS,
  };
  return { bytes, fromCache: false };
};

const addAcceptedUploadBytes = (bytes) => {
  if (uploadUsageCache.bytes === null) return;
  uploadUsageCache = {
    ...uploadUsageCache,
    bytes: uploadUsageCache.bytes + bytes,
  };
};

const enforceUploadQuota = async (files = []) => {
  const uploadedFiles = flattenFiles(files);
  if (!uploadedFiles.length) return;

  const uploadedBytes = await getUploadedFilesSizeBytes(uploadedFiles);
  const usage = await getUploadUsage();
  const projectedBytes = usage.fromCache ? usage.bytes + uploadedBytes : usage.bytes;

  if (projectedBytes <= env.uploads.maxBytes) {
    if (usage.fromCache) addAcceptedUploadBytes(uploadedBytes);
    return;
  }

  removeUploadedFiles(uploadedFiles);
  logger.warn(
    { usedBytes: projectedBytes, maxBytes: env.uploads.maxBytes },
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
    thumbnailFiles.push(
      ...(await runWithConcurrency(files, THUMBNAIL_CONCURRENCY, createThumbnail)),
    );
    return thumbnailFiles;
  } catch (error) {
    removeUploadedFiles([...files, ...thumbnailFiles, ...(error.results || [])]);
    logger.warn({ error: error.message }, "Erro ao gerar thumbnail");
    throw new ValidationError("Erro ao processar imagem", ERROR_CODES.UPLOAD_ERROR);
  }
};

export const validateUploadImage = (req, res, next) => {
  upload.array("photos", 5)(req, res, async (err) => {
    if (err) {
      logger.warn({ error: err.message }, "Erro no upload de imagem");
      return next(
        new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR),
      );
    }

    try {
      await validateFileSignatures(req.files);
      await enforceUploadQuota(req.files);
      next();
    } catch (error) {
      next(error);
    }
  });
};

export const validateProfilePhotoUpload = (req, res, next) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) {
      logger.warn({ error: err.message }, "Erro no upload da foto de perfil");
      return next(
        new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR),
      );
    }

    try {
      if (req.file) {
        await validateFileSignatures([req.file]);
        await enforceUploadQuota([req.file]);
      }
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
      await validateFileSignatures(photos);
      const thumbnailPhotos = await createThumbnails(photos);
      req.files = {
        photos,
        thumbnailPhotos,
      };
      await enforceUploadQuota([...photos, ...thumbnailPhotos]);
      next();
    } catch (error) {
      next(error);
    }
  });
};
