import {
  decodeCursor,
  encodeCursor,
  validateCursorContext,
} from "../utils/cursor.util.js";
import { InvalidCursorError } from "../errors/pagination.error.js";

const getCursorValues = (cursorData, cursorSchema) => {
  const result = cursorSchema.safeParse(cursorData.values);

  if (!result.success) {
    throw new InvalidCursorError();
  }

  return result.data;
};

export const paginateFirestore = async ({
  query,
  cursor,
  limit,
  cursorContext,
  cursorSchema,
  getCursorValuesFromDoc,
  mapDoc,
}) => {
  let paginatedQuery = query;

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    validateCursorContext(cursorData, cursorContext);

    const cursorValues = getCursorValues(cursorData, cursorSchema);
    paginatedQuery = paginatedQuery.startAfter(...cursorValues);
  }

  const snapshot = await paginatedQuery.limit(limit + 1).get();
  const pageDocs = snapshot.docs.slice(0, limit);
  const hasMore = snapshot.docs.length > limit;
  const nextCursor =
    hasMore && pageDocs.length > 0
      ? encodeCursor({
          context: cursorContext,
          values: getCursorValuesFromDoc(pageDocs.at(-1)),
        })
      : null;
  const items = pageDocs.map(mapDoc);

  return {
    items,
    pageInfo: {
      limit,
      hasMore,
      nextCursor,
    },
  };
};
