let lastSentMove: string | null = null;
let lastSentFen: string | null = null;
let websocket: WebSocket | null = null;
let messageQueue: string[] = [];

/**
 * Load the configuration (device ID, server host, server port, and board number) from `config.json` in the public folder.
 */
const getConfig = async (): Promise<{ deviceId: string; serverHost: string; serverPort: number; boardNumber: number }> => {
  const configPath = `${window.location.origin}/config.json`; // Adjust path to config.json
  try {
    const response = await fetch(configPath);
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.statusText}`);
    }
    const config = await response.json();

    if (!config.deviceId || !config.serverHost || !config.serverPort || !config.boardNumber) {
      throw new Error("Incomplete configuration. Ensure all required fields are in config.json.");
    }

    return config;
  } catch (error) {
    console.error("Error loading configuration:", error.message);
    return { deviceId: "unknown-device", serverHost: "localhost", serverPort: 8080, boardNumber: 1 }; // Default fallback
  }
};

/**
 * Establish and reuse a WebSocket connection.
 */
const establishWebSocketConnection = async (): Promise<WebSocket> => {
  const { serverHost, serverPort } = await getConfig();

  if (!websocket || websocket.readyState === WebSocket.CLOSED) {
    websocket = new WebSocket(`ws://${serverHost}:${serverPort}`);

    websocket.onopen = () => {
      console.log("WebSocket connection established.");
      // Send queued messages
      while (messageQueue.length > 0) {
        const message = messageQueue.shift();
        websocket?.send(message!);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed.");
      websocket = null;
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  return websocket;
};

/**
 * Push data securely to the server using WebSocket.
 * @param payload - The data payload to be sent.
 */
export const pushDataToServer = async (payload: any): Promise<void> => {
  try {
    // Avoid duplicate moves by checking both lastMove and fen
    if (payload.lastMove === lastSentMove && payload.fen === lastSentFen) {
      console.log("Duplicate move detected. Skipping payload.");
      return;
    }

    const { deviceId, boardNumber } = await getConfig();

    const completePayload = {
      deviceId,
      boardNumber,
      ...payload,
    };

    const movesArray = payload.moves.trim().split(/\s+/);
    const lastMoveFull = movesArray[movesArray.length - 1];
    const figureType = /^[KQRBN]/.test(lastMoveFull) ? lastMoveFull[0] : "";

    completePayload.lastMove = figureType ? `${figureType} ${payload.lastMove}` : payload.lastMove;
    const payloadString = JSON.stringify(completePayload);

    console.log("Queueing payload for WebSocket:", payloadString);

    const ws = await establishWebSocketConnection();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payloadString);
    } else {
      messageQueue.push(payloadString);
    }

    // Update last sent move and fen to avoid duplicates
    lastSentMove = payload.lastMove;
    lastSentFen = payload.fen;
  } catch (error) {
    console.error("Error in pushDataToServer:", error.message);
  }
};