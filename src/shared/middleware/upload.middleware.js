import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadDir = 'uploads'

// cria pasta se não existir
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const fileName = Date.now() + path.extname(file.originalname)
    cb(null, fileName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg']

  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Apenas JPG e PNG são permitidos'))
  }
}

export default multer({ storage, fileFilter })