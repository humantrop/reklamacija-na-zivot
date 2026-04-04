// This route exists as a placeholder.
// Socket.io is handled by the custom server (server.ts).
// The /api/socketio path is used as the Socket.io endpoint.

export async function GET() {
  return new Response("Socket.io endpoint - handled by custom server", {
    status: 200,
  });
}
