export const globalClients = new Set<WebSocket>();

export function broadcastToClients(message: string) {
  for (const client of globalClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
