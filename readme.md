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
│   │   ├── helpers/
│   │   ├── middlewares/
│   │   ├── utils/
│   │   ├── errors/
│   │   └── types/
│   └── validators/
│
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── server.js
```

---

## 📁 Descrição das Pastas

### `src/config/`

Centraliza todas as configurações globais de bibliotecas e ambiente.

| Arquivo         | Responsabilidade                             |
| --------------- | -------------------------------------------- |
| `firebase.js`   | Inicializa o Firebase Admin SDK (Firestore)  |
| `storage.js`    | Configuração específica para salvar arquivos |
| `env.js`        | Leitura das variáveis de ambiente            |
| `zod.config.js` | Configuração global e customizações do Zod   |

---

### `src/modules/`

Coração da aplicação. Cada módulo representa um **domínio de negócio** do PetSOS e é totalmente autocontido, seguindo a estrutura:

```
modules/
└── <nome-do-modulo>/
    ├── <nome>.controller.js   # Recebe a requisição e devolve a resposta HTTP
    ├── <nome>.service.js      # Contém as regras de negócio
    └── <nome>.repository.js   # Acesso ao banco de dados
```

#### Módulos ativos/previstos:

**`modules/complaints/`** — Denúncias _(Sprint 1 — Alta prioridade)_

- Criar denúncia com descrição e localização
- Anexar fotos como evidência
- Editar e excluir denúncia
- Listar todas as denúncias

**`modules/users/`** — Usuários _(Sprint 4)_

- Criar conta e autenticação
- Login, logout e recuperação de senha

---

### `src/routes/`

Define e agrupa todas as rotas da API, conectando as URLs aos controllers de cada módulo.

```
routes/
├── index.js               # Ponto central que registra todas as rotas no Express
├── complaints.routes.js   # Rotas de denúncias com middlewares de validação
```

**Convenção de rotas:**

| Método   | Rota                  | Descrição                |
| -------- | --------------------- | ------------------------ |
| `POST`   | `/api/complaints`     | Criar denúncia           |
| `GET`    | `/api/complaints`     | Listar denúncias         |
| `GET`    | `/api/complaints/:id` | Detalhes de uma denúncia |
| `PATCH`  | `/api/complaints/:id` | Editar denúncia          |
| `DELETE` | `/api/complaints/:id` | Excluir denúncia         |

---

### `src/shared/`

Código reutilizável compartilhado entre todos os módulos.

---

#### `src/shared/middlewares/`

Funções que interceptam o ciclo de requisição/resposta do Express.

| Arquivo                | Responsabilidade                                   |
| ---------------------- | -------------------------------------------------- |
| `upload.middleware.js` | Processa o upload de fotos para o disco local      |
| `error.middleware.js`  | Middleware global para captura e resposta de erros |

---

#### `src/shared/helpers/`

Funções que auxiliam em lógicas específicas de negócio ou operações complexas.

| Arquivo          | Responsabilidade                                          |
| ---------------- | --------------------------------------------------------- |
| `file.helper.js` | Auxilia na manipulação de arquivos (ex: deleção de fotos) |

---

#### `src/shared/utils/`

Abstrações técnicas e funções puras para padronização e reuso de código.

| Arquivo                 | Responsabilidade                                                |
| ----------------------- | --------------------------------------------------------------- |
| `async-handler.util.js` | Utilitário para capturar erros em controllers assíncronos (HOF) |
| `firestore.util.js`     | Serialização de dados provenientes do Firestore                 |
| `response.util.js`      | Padroniza o formato de resposta da API (`{ success, data }`)    |

---

#### `src/shared/errors/`

Centraliza a definição de exceções customizadas da aplicação.

| Arquivo                    | Responsabilidade                                    |
| -------------------------- | --------------------------------------------------- |
| `app.error.js`             | Classe base para erros operacionais                 |
| `error.codes.js`           | Dicionário de códigos de erro para o frontend       |
| `not_found.error.js`       | Erro específico para recursos não encontrados (404) |
| `validation.error.js`      | Erro formatado para falhas de validação (400)       |
| `internal_server.error.js` | Erro genérico para falhas inesperadas (500)         |

---

#### `src/shared/types/`

Enums, constantes e códigos de erros que evitam o uso de "strings mágicas".

| Arquivo                | Conteúdo                                            |
| ---------------------- | --------------------------------------------------- |
| `complaint.status.js`  | Status: `aberto`, `fechado`, `resolvido`            |
| `complaint.animals.js` | Tipos de animais: `cachorro`, `gato`, `passaro` etc |
| `complaint.types.js`   | Tipos de denúncia: `abandono`, `violencia` etc      |
| `error.codes.js`       | Dicionário de códigos de erro para o frontend       |

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
FIREBASE_COLLECTION_PREFIX=
```

---

## 📦 Dependências principais

| Pacote           | Uso                                 |
| ---------------- | ----------------------------------- |
| `express`        | Framework HTTP                      |
| `dotenv`         | Leitura de variáveis de ambiente    |
| `firebase-admin` | Acesso ao Firestore (banco)         |
| `multer`         | Processamento de upload de arquivos |
| `zod`            | Validação de schemas e tipos        |

---

## 🗺️ Roadmap por Sprint (BACKEND)

| Sprint   | Módulos envolvidos                                     | Status       |
| -------- | ------------------------------------------------------ | ------------ |
| Sprint 1 | `complaints` (CRUD + geolocalização + upload de fotos) | ✅ Concluído |
| Sprint 2 | `complaints` (filtros + mapa) + `collaborations`       | 🔲 Backlog   |
| Sprint 3 | `complaints` (status + histórico) + `validations`      | 🔲 Backlog   |
| Sprint 4 | `users` (auth completa)                                | 🔲 Backlog   |
