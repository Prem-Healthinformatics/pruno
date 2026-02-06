import { GameRoom } from './GameRoom';

export interface Env {
    GAME_ROOM: DurableObjectNamespace;
}

export { GameRoom };

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                },
            });
        }

        // Route: /api/room/:roomId
        const match = url.pathname.match(/^\/api\/room\/([A-Z0-9]+)$/i);
        if (match) {
            const roomId = match[1].toUpperCase();

            // Get or create the Durable Object for this room
            const id = env.GAME_ROOM.idFromName(roomId);
            const room = env.GAME_ROOM.get(id);

            // Forward the request to the Durable Object
            return room.fetch(request);
        }

        // Health check
        if (url.pathname === '/health') {
            return new Response('OK', { status: 200 });
        }

        return new Response('Not Found', { status: 404 });
    },
};
