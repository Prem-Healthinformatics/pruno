
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from './GameRoom';
import { createServer } from 'http';
import { parse } from 'url';

const port = 8787;
const server = createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map<string, GameRoom>();

wss.on('connection', (ws, req) => {
    const { pathname } = parse(req.url || '', true);
    // Expected format: /api/room/:id
    const match = pathname?.match(/\/api\/room\/([^\/]+)/);

    if (!match) {
        ws.close(1008, 'Invalid Room URL');
        return;
    }

    const roomId = match[1];
    console.log(`Connection to room: ${roomId}`);

    let room = rooms.get(roomId);
    if (!room) {
        room = new GameRoom(roomId);
        rooms.set(roomId, room);
    }

    room.handleConnection(ws);
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
