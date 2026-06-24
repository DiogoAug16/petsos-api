import { WebSocket, WebSocketServer } from "ws";
import logger from "../../logger/index.js";

const TILE_EVENTS_PATH = "/api/complaints/map/tiles/events";
const HEARTBEAT_INTERVAL_MS = 30 * 1000;

let webSocketServer = null;
let heartbeatTimer = null;

const sendJson = (client, payload) => {
  if (client.readyState !== WebSocket.OPEN) return;
  client.send(JSON.stringify(payload));
};

export const setupMapTileRealtime = (server) => {
  webSocketServer = new WebSocketServer({
    server,
    path: TILE_EVENTS_PATH,
  });

  webSocketServer.on("connection", (client) => {
    client.isAlive = true;
    client.on("pong", () => {
      client.isAlive = true;
    });

    sendJson(client, {
      type: "connected",
      timestamp: Date.now(),
    });
  });

  heartbeatTimer = setInterval(() => {
    for (const client of webSocketServer.clients) {
      if (!client.isAlive) {
        client.terminate();
        continue;
      }

      client.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  webSocketServer.on("close", () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });

  logger.info({ path: TILE_EVENTS_PATH }, "Realtime de tiles do mapa ativo");
};

export const publishMapTileInvalidation = ({ tileKeys, complaintId, action }) => {
  if (!webSocketServer || !tileKeys?.length) return;

  const payload = {
    type: "map_tiles_invalidated",
    tileKeys: [...new Set(tileKeys)],
    complaintId,
    action,
    timestamp: Date.now(),
  };

  for (const client of webSocketServer.clients) {
    sendJson(client, payload);
  }
};
