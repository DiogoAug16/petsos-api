import swaggerUi from "swagger-ui-express";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "PetsOS API",
    version: "1.1.0",
    description:
      "Documentação operacional da API PetsOS para testes manuais, QA e inspeção de rotas.",
  },
  servers: [
    {
      url: "/api",
      description: "Servidor atual",
    },
  ],
  tags: [
    { name: "App" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Complaints" },
    { name: "Moderation" },
    { name: "Map" },
    { name: "Notifications" },
    { name: "Routes" },
    { name: "Metrics" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Firebase ID Token",
      },
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          errorCode: { type: "string" },
        },
      },
      Coordinate: {
        type: "object",
        properties: {
          latitude: { type: "number", example: -15.62 },
          longitude: { type: "number", example: -56.05 },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Token ausente ou inválido",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      ValidationError: {
        description: "Payload ou parâmetros inválidos",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
      Forbidden: {
        description: "Usuário sem permissão para acessar o recurso",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      },
    },
  },
  paths: {
    "/app/bootstrap": {
      get: {
        tags: ["App"],
        summary: "Retorna dados mínimos para inicialização rápida do app",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Bootstrap carregado" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/auth/complete-profile": {
      post: {
        tags: ["Auth"],
        summary: "Completa o perfil após criação no Firebase Auth",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "username"],
                properties: {
                  name: { type: "string", example: "Diogo Augusto" },
                  username: { type: "string", example: "diogo" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Perfil completo" },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/auth/validate-email": {
      post: {
        tags: ["Auth"],
        summary: "Valida formato, MX e lista de emails descartáveis",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "usuario@email.com" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Email aceito" },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/auth/check-username/{username}": {
      get: {
        tags: ["Auth"],
        summary: "Verifica disponibilidade de username",
        parameters: [
          {
            name: "username",
            in: "path",
            required: true,
            schema: { type: "string", example: "diogo" },
          },
        ],
        responses: {
          200: { description: "Disponibilidade retornada" },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Retorna o perfil do usuário autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Perfil retornado" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Atualiza perfil do usuário autenticado",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  locationLabel: { type: "string", example: "Cuiabá, MT" },
                  description: { type: "string" },
                  photo: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Perfil atualizado" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users/me/summary": {
      get: {
        tags: ["Users"],
        summary: "Retorna perfil, resumo de acompanhadas e notificações",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Resumo retornado" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/users/{username}/profile-summary": {
      get: {
        tags: ["Users"],
        summary: "Retorna perfil público e resumo agregado",
        parameters: [
          {
            name: "username",
            in: "path",
            required: true,
            schema: { type: "string", example: "diogo" },
          },
        ],
        responses: {
          200: { description: "Resumo retornado" },
        },
      },
    },
    "/complaints": {
      get: {
        tags: ["Complaints"],
        summary: "Lista denúncias paginadas",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", example: 50 },
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Página retornada" },
        },
      },
      post: {
        tags: ["Complaints"],
        summary: "Cria denúncia",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                  animal: { type: "string" },
                  location: {
                    type: "string",
                    example: '{"latitude":-15.62,"longitude":-56.05}',
                  },
                  photos: {
                    type: "array",
                    items: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Denúncia criada" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/complaints/{id}": {
      get: {
        tags: ["Complaints"],
        summary: "Detalha denúncia",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Denúncia retornada" },
        },
      },
      patch: {
        tags: ["Complaints"],
        summary: "Atualiza denúncia",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Denúncia atualizada" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Complaints"],
        summary: "Exclui denúncia",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Denúncia excluída" },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/complaints/{id}/report": {
      post: {
        tags: ["Complaints"],
        summary: "Reporta uma denúncia para moderação administrativa",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", maxLength: 500, nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Reporte registrado" },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { description: "Usuário já reportou esta denúncia" },
        },
      },
    },
    "/complaints/moderation/pending": {
      get: {
        tags: ["Moderation"],
        summary: "Lista denúncias aguardando moderação",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", example: 20 },
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Pendências retornadas" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/complaints/admin": {
      get: {
        tags: ["Moderation"],
        summary: "Lista denúncias para administração, incluindo ocultas",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", example: 20 },
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Página administrativa retornada" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/complaints/admin/{id}": {
      get: {
        tags: ["Moderation"],
        summary: "Detalha denúncia para administração, incluindo ocultas",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Denúncia administrativa retornada" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { description: "Denúncia não encontrada" },
        },
      },
    },
    "/complaints/{id}/moderation/approve": {
      patch: {
        tags: ["Moderation"],
        summary: "Aprova denúncia reportada",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", maxLength: 500, nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Denúncia aprovada" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/complaints/{id}/moderation/reject": {
      patch: {
        tags: ["Moderation"],
        summary: "Rejeita denúncia reportada e remove das consultas públicas",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Denúncia rejeitada" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/complaints/{id}/moderation/hide": {
      patch: {
        tags: ["Moderation"],
        summary: "Oculta denúncia reportada das consultas públicas",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Denúncia ocultada" },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/complaints/map/tiles/batch": {
      post: {
        tags: ["Map"],
        summary: "Busca denúncias de múltiplos tiles do mapa",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  limit: { type: "integer", example: 120 },
                  tiles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        z: { type: "integer", example: 12 },
                        x: { type: "integer", example: 1410 },
                        y: { type: "integer", example: 2229 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Tiles retornados" },
        },
      },
    },
    "/complaints/map/tiles-index": {
      get: {
        tags: ["Map"],
        summary: "Retorna tiles próximos que possuem denúncias",
        parameters: [
          { name: "lat", in: "query", required: true, schema: { type: "number" } },
          { name: "lng", in: "query", required: true, schema: { type: "number" } },
          { name: "radiusKm", in: "query", schema: { type: "number", example: 10 } },
          { name: "z", in: "query", schema: { type: "integer", example: 12 } },
        ],
        responses: {
          200: { description: "Índice retornado" },
        },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Lista notificações do usuário",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Notificações retornadas" },
        },
      },
      delete: {
        tags: ["Notifications"],
        summary: "Limpa notificações do usuário",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Notificações limpas" },
        },
      },
    },
    "/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Conta notificações não lidas",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Contador retornado" },
        },
      },
    },
    "/routes/driving": {
      get: {
        tags: ["Routes"],
        summary: "Calcula rota de direção via OpenRouteService",
        parameters: [
          {
            name: "start",
            in: "query",
            required: true,
            schema: { type: "string", example: "-56.049,-15.619" },
          },
          {
            name: "end",
            in: "query",
            required: true,
            schema: { type: "string", example: "-56.064,-15.622" },
          },
        ],
        responses: {
          200: { description: "Rota retornada" },
          502: { description: "Serviço externo indisponível" },
        },
      },
    },
    "/metrics": {
      get: {
        tags: ["Metrics"],
        summary: "Métricas Prometheus do backend",
        description:
          "Se METRICS_TOKEN estiver configurado, envie Authorization: Bearer <token>.",
        responses: {
          200: {
            description: "Métricas em formato Prometheus",
            content: {
              "text/plain": {
                schema: { type: "string" },
              },
            },
          },
          401: { description: "Token de métricas inválido" },
        },
      },
    },
  },
};

export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(openApiSpec, {
  explorer: true,
  customSiteTitle: "PetsOS API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
});
