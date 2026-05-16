import { InvalidCursorError } from "../errors/pagination.error.js";

export const encodeCursor = (payload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

export const decodeCursor = (cursor) => {
  if (typeof cursor !== "string" || cursor.trim() === "") {
    throw new InvalidCursorError();
  }
  let payload;

  try {
    payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCursorError();
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new InvalidCursorError();
  }

  return payload;
};

export const validateCursorContext = (cursorData, context) => {
  if (!cursorData.context || typeof cursorData.context !== "object") {
    throw new InvalidCursorError();
  }

  for (const [key, value] of Object.entries(context)) {
    if (!Object.is(cursorData.context[key], value)) {
      throw new InvalidCursorError();
    }
  }
};
