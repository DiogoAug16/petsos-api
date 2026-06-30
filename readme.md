# PetSOS — Backend API

API REST do **PetSOS**, responsável por autenticação complementar, perfis, denúncias, mapa, uploads, notificações, comentários, evidências, rotas, moderação e observabilidade. O backend é construído com **Node.js + Express 5**, usa **Firebase Admin + Firestore** como camada de dados e atende o app mobile do repositório `petsos`.

## Responsabilidades da API

- Validar payloads e centralizar regras de negócio.
- Garantir permissões de usuário, admin e fluxos públicos.
- Persistir denúncias, usuários, seguidores, voluntários, notificações e comentários no Firestore.
- Processar uploads e gerar thumbnails.
- Expor consultas de mapa por geohash, tiles, índice e batch.
- Fazer proxy seguro para OpenRouteService.
- Servir autocomplete de cidades via IBGE com cache.
- Gerenciar reportes e decisões administrativas.
- Expor logs, métricas e documentação OpenAPI.

## Stack principal

| Tecnologia       | Uso                                          |
| ---------------- | -------------------------------------------- |
| Node.js          | Runtime da API                               |
| Express 5        | Framework HTTP                               |
| Firebase Admin   | Autenticação de tokens e acesso ao Firestore |
| Firestore        | Banco principal                              |
| Zod              | Validação de schemas                         |
| Multer           | Upload multipart                             |
| Sharp            | Geração de thumbnails                        |
| Helmet / CORS    | Hardening HTTP                               |
| Pino / Pino HTTP | Logs estruturados                            |
| prom-client      | Métricas Prometheus                          |
| Swagger UI       | Documentação interativa da API               |
| geofire-common   | Consultas geográficas por geohash            |
| ws               | Realtime de invalidação de tiles             |
| Autocannon       | Benchmarks locais                            |

## Estrutura do projeto

```txt
petsos-api/
  src/routes/          Rotas HTTP e middlewares por recurso
  src/modules/         Controllers, services e repositories por domínio
  src/schemas/         Schemas Zod de entrada
  src/validators/      Upload, auth e validações de request
  src/shared/          Erros, helpers, middlewares, utils e tipos
  src/config/          Firebase, env, Swagger, métricas e integrações
  src/logger/          Logger da aplicação
  scripts/             Backfills e manutenção operacional
  uploads/             Arquivos locais em produção
```

## Módulos principais

| Módulo                                           | Responsabilidade                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `auth`                                           | Completar perfil, validar username, validar email e domínios temporários |
| `users`                                          | Perfil privado, perfil público, edição de perfil e foto                  |
| `complaints`                                     | CRUD, paginação, mapa, nearest, tiles e status                           |
| `complaint-followers`                            | Acompanhamento de denúncias                                              |
| `complaint-volunteers`                           | Voluntariado em denúncias                                                |
| `complaint-evidence`                             | Evidências e fotos de resolução                                          |
| `complaint-votes` / `complaint-validations`      | Votação e validação de resolução                                         |
| `comments` / `comment-replies` / `comment-likes` | Comentários, respostas, likes e reportes                                 |
| `notifications`                                  | Lista, contador, leitura e limpeza                                       |
| `complaint-moderations`                          | Fila admin, denúncias reportadas e comentários reportados                |
| `map-tiles`                                      | Estatísticas, batch, cache e invalidação realtime dos tiles              |
| `routes`                                         | Rotas por ruas usando OpenRouteService                                   |
| `locations`                                      | Autocomplete de cidades via IBGE com cache                               |
| `app`                                            | Bootstrap inicial do app                                                 |

## Endpoints importantes

### Bootstrap e perfil

- `GET /api/app/bootstrap`
- `GET /api/users/me/summary`
- `GET /api/users/:username/profile-summary`
- `PATCH /api/users/me`

### Denúncias e mapa

- `GET /api/complaints?limit=20`
- `POST /api/complaints`
- `GET /api/complaints/:id`
- `PATCH /api/complaints/:id`
- `DELETE /api/complaints/:id`
- `GET /api/complaints/nearest`
- `GET /api/complaints/map/tiles-index`
- `POST /api/complaints/map/tiles/batch`
- `GET /api/complaints/map/tiles/events`

### Comunidade e moderação

- `POST /api/complaints/:id/followers`
- `POST /api/complaints/:id/volunteers`
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/complaints/:id/report`
- `GET /api/complaints/moderation/pending`
- `POST /api/complaints/:id/moderation/approve`
- `POST /api/complaints/:id/moderation/reject`
- `POST /api/complaints/:id/moderation/hide`

### Integrações

- `GET /api/routes/driving`
- `GET /api/locations/cities`
- `GET /api/openapi.json`
- `GET /api/docs`
- `GET /api/metrics`

## Segurança

- Firebase Auth valida a identidade; o backend é a autoridade final das permissões.
- Rotas sensíveis exigem autenticação e, quando necessário, role `admin`.
- Usuários convidados podem visualizar denúncias públicas, fotos e seguidores.
- Usuários não verificados podem acompanhar denúncias e receber notificações, mas ações mais sensíveis continuam bloqueadas.
- Payloads são validados com Zod.
- Uploads validam tipo, tamanho e processamento.
- Chaves externas, como OpenRouteService, ficam apenas no backend.
- Reportes possuem rate limit.
- Email temporário é bloqueado com lista local e domínio é validado por DNS/MX.

## Otimizações

- Paginação de denúncias com cursor.
- Geohash para `/nearest` e consultas geográficas.
- Índice de tiles para o app saber quais regiões possuem denúncias.
- Batch endpoint para buscar múltiplos tiles em uma única request.
- Invalidação realtime quando denúncias são criadas, editadas, resolvidas ou apagadas.
- Thumbnails com Sharp para reduzir peso de imagens no app.
- Endpoints agregados de perfil e bootstrap para reduzir round-trips.
- Benchmarks com Autocannon para rotas críticas.

## Observabilidade

- Logs estruturados com Pino e Pino HTTP.
- Swagger UI para consultar contratos da API.
- Métricas Prometheus em `/api/metrics`, protegidas por `METRICS_TOKEN`.
- Scripts de benchmark:

```bash
npm run bench
npm run bench:complaints
npm run bench:map-index
npm run bench:openapi
```

## Variáveis de ambiente

Crie um `.env` baseado em `.env.example`.

```env
PORT=3030
NODE_ENV=development
FIREBASE_COLLECTION_PREFIX=dev_

FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

OPENROUTESERVICE_API_KEY=
CORS_ORIGIN=
UPLOADS_MAX_BYTES=2147483648
METRICS_TOKEN=
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

Observações:

- O app mobile normalmente aponta para `/api`, então confira proxy/nginx em produção.
- `METRICS_TOKEN` deve ser definido antes de expor `/api/metrics`.
- `OPENROUTESERVICE_API_KEY` deve ficar somente no backend.
- Em produção, fotos ficam localmente no servidor em `/uploads`.

## Como rodar

```bash
npm install
npm run dev
```

Comandos úteis:

```bash
npm start
npm test
npm run lint:check
npm run lint:fix
npm run bench
```

## Scripts de manutenção

```bash
npm run backfill:complaint-geohashes
npm run backfill:complaint-public-visibility
npm run backfill:map-tile-stats
npm run backfill:complaint-thumbnails
```

Use esses scripts após mudanças de modelo, criação de novos índices ou migrações de dados antigos.

## Índices Firestore

Algumas consultas exigem índices compostos, principalmente:

- denúncias públicas ordenadas por criação;
- geohash com visibilidade pública;
- paginação e filtros do mapa;
- coleções com prefixo configurado por `FIREBASE_COLLECTION_PREFIX`.

Depois de alterar `firebase.indexes.json`, faça o deploy dos índices no projeto correto do Firebase antes de testar rotas dependentes.

## Validação antes de PR

```bash
npm run lint:check
npm test
npm run bench
```

Para mudanças de mapa ou Firestore, valide também:

- `/api/complaints/map/tiles-index`;
- `/api/complaints/map/tiles/batch`;
- `/api/complaints/nearest`;
- realtime de tiles;
- criação, edição e exclusão de denúncia.
