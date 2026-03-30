# 🐾 PetSOS — Backend

API REST do aplicativo **PetSOS**, uma plataforma colaborativa de denúncias de maus-tratos contra animais. Construída com **Node.js + Express**, organizada em monorepo junto ao frontend mobile (React Native + Expo).

---

## 🗂️ Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── complaints/
│   │   └── users/
│   ├── routes/
│   ├── schemas/
│   ├── shared/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── errors/
│   │   └── types/
│   └── validators/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 📁 Descrição das Pastas

### `src/config/`

Centraliza todas as configurações globais da aplicação.

| Arquivo (exemplo) | Responsabilidade                                      |
| ----------------- | ----------------------------------------------------- |
| `firebase.js`     | Inicializa o Firebase Admin SDK (Firestore + Storage) |
| `env.js`          | Leitura e validação das variáveis de ambiente         |

> ✅ Nenhuma lógica de negócio deve existir aqui — apenas setup e inicialização.

---

### `src/modules/`

Coração da aplicação. Cada módulo representa um **domínio de negócio** do PetSOS e é totalmente autocontido, seguindo a estrutura:

```
modules/
└── <nome-do-modulo>/
    ├── <nome>.controller.js   # Recebe a requisição e devolve a resposta HTTP
    ├── <nome>.service.js      # Contém as regras de negócio
    └── <nome>.repository.js  # Acesso ao banco de dados (queries)
```

#### Módulos previstos:

**`modules/complaints/`** — Denúncias _(Sprint 1 — Alta prioridade)_

- Criar denúncia com descrição e localização
- Anexar fotos como evidência
- Editar e excluir denúncia própria
- Listar e filtrar denúncias no mapa

**`modules/users/`** — Usuários _(Sprint 4)_

- Criar conta e autenticação
- Login, logout e recuperação de senha

---

### `src/routes/`

Define e agrupa todas as rotas da API, conectando as URLs aos controllers de cada módulo.

```
routes/
├── index.js               # Ponto central que registra todas as rotas no Express
├── complaints.routes.js
```

**Convenção de rotas (Exemplos):**

| Método   | Rota                  | Descrição                |
| -------- | --------------------- | ------------------------ |
| `POST`   | `/api/complaints`     | Criar denúncia           |
| `GET`    | `/api/complaints`     | Listar denúncias         |
| `GET`    | `/api/complaints/:id` | Detalhes de uma denúncia |
| `PUT`    | `/api/complaints/:id` | Editar denúncia          |
| `DELETE` | `/api/complaints/:id` | Excluir denúncia         |

---

### `src/shared/`

Código reutilizável compartilhado entre todos os módulos. Nada aqui deve conter regras de negócio específicas.

---

#### `src/shared/middleware/`

Funções intermediárias executadas antes dos controllers nas requisições.

| Arquivo (exemplo)            | Responsabilidade                                   |
| ---------------------------- | -------------------------------------------------- |
| `upload.middleware.js`       | Processa o upload de fotos para o Firebase Storage |
| `validate.middleware.js`     | Valida o corpo da requisição com base em schemas   |
| `errorHandler.middleware.js` | Captura e formata erros de forma padronizada       |

---

#### `src/shared/utils/`

Funções auxiliares puras e reutilizáveis.

| Arquivo (exemplo)  | Responsabilidade                                                      |
| ------------------ | --------------------------------------------------------------------- |
| `geoUtils.js`      | Funções de geolocalização (ex: calcular distância entre pontos)       |
| `dateUtils.js`     | Formatação e manipulação de datas                                     |
| `responseUtils.js` | Padroniza o formato de resposta da API (`{ success, data, message }`) |

---

#### `src/shared/errors/`

Centraliza as classes de erro customizadas da aplicação, tornando o tratamento de erros consistente em todos os módulos.

```js
// Exemplo de uso
throw new AppError("Denúncia não encontrada", 404);
```

| Arquivo (exemplo) | Responsabilidade                                             |
| ----------------- | ------------------------------------------------------------ |
| `AppError.js`     | Classe base de erro com statusCode e mensagem                |
| `httpErrors.js`   | Erros HTTP semânticos prontos (NotFound, Unauthorized, etc.) |

---

#### `src/shared/types/`

Constantes e enums usados em toda a aplicação, evitando strings mágicas espalhadas pelo código.

```js
// Exemplo
const COMPLAINT_STATUS = { OPEN: "open", RESOLVED: "resolved", CLOSED: "closed" };
const USER_ROLES = { CITIZEN: "citizen", ONG: "ong", ADMIN: "admin" };
```

---

## 🚀 Como rodar localmente

```bash
# Na raiz do monorepo
cd backend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Rodar em desenvolvimento
npm run dev
```

---

## 🔑 Variáveis de Ambiente (`.env.example`)

```env
PORT=3000
NODE_ENV=development

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
FIREBASE_STORAGE_BUCKET=
```

---

## 📦 Dependências principais

| Pacote           | Uso                                                            |
| ---------------- | -------------------------------------------------------------- |
| `express`        | Framework HTTP                                                 |
| `dotenv`         | Leitura de variáveis de ambiente                               |
| `firebase-admin` | Acesso ao Firestore (banco) e Storage (fotos)                  |
| `multer`         | Processa o upload de fotos antes de enviar ao Firebase Storage |
| `zod` / `joi`    | Validação de dados das requisições                             |

---

## 🗺️ Roadmap por Sprint

| Sprint   | Módulos envolvidos                                     | Status     |
| -------- | ------------------------------------------------------ | ---------- |
| Sprint 1 | `complaints` (CRUD + geolocalização + upload de fotos) | 🔲 Backlog |
| Sprint 2 | `complaints` (filtros + mapa) + `collaborations`       | 🔲 Backlog |
| Sprint 3 | `complaints` (status + histórico) + `validations`      | 🔲 Backlog |
| Sprint 4 | `users` (auth completa)                                | 🔲 Backlog |
