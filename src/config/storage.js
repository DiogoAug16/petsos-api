import fs from 'fs';
import path from 'path';

export const UPLOADS_DIR = path.resolve('uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('Pasta uploads/ criada com sucesso');
}