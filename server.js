import "./src/config/env.js";
import express from "express";
import cors from "cors";
import routes from "./src/routes/index.js";
import { errorHandler } from "./src/shared/errors/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));
app.use('/api', routes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
