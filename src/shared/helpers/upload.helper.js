import fs from "fs";
import path from "path";

export const deleteFiles = (filePaths = []) => {
  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const fullPath = path.resolve("uploads", fileName);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
};
