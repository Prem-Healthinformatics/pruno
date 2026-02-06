import type { GameState, Player, Card } from '@pruno/shared';
import { createDeck, canPlayCard, getNextTurnIndex } from '@pruno/shared';

interface WebSocketSession {
    webSocket: WebSocket;
    playerId?: string;
}

export class GameRoom implements DurableObject {
    state: DurableObjectState;
    sessions: WebSocketSession[] = [];
    gameState: GameState;

    constructor(state: DurableObjectState) {
        this.state = state;
        this.gameState = {
            roomId: '',
            players: [],
            deckCount: 0,
            discardPile: [],
            turnIndex: 0,
            direction: 1,
            status: 'waiting',
            currentColor: 'red'
        };

        // Restore state from storage
        this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage.get<GameState>('gameState');
            if (stored) {
                this.gameState = stored;
            }
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Extract room ID from URL
        const match = url.pathname.match(/\/api\/room\/([A-Z0-9]+)/i);
        if (match && !this.gameState.roomId) {
            this.gameState.roomId = match[1].toUpperCase();
        }

        // Handle WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            this.state.acceptWebSocket(server);
            this.sessions.push({ webSocket: server });

            return new Response(null, {
                status: 101,
                webSocket: client,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                }
            });
        }

        return new Response('Expected WebSocket', { status: 400 });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        try {
            const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
            const action = JSON.parse(data);
            await this.handleAction(ws, action);
        } catch (e) {
            console.error('Error handling message:', e);
        }
    }

    async webSocketClose(ws: WebSocket) {
        this.sessions = this.sessions.filter(s => s.webSocket !== ws);
    }

    async webSocketError(ws: WebSocket, error: unknown) {
        console.error('WebSocket error:', error);
        this.sessions = this.sessions.filter(s => s.webSocket !== ws);
    }

    private async handleAction(ws: WebSocket, action: any) {
        switch (action.type) {
            case 'JOIN':
                if (this.gameState.players.length >= 6) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room full' }));
                    return;
                }

                const newPlayer: Player = {
                    id: action.payload.id || crypto.randomUUID(),
                    name: action.payload.name || 'Guest',
                    hand: []
                };

                // Associate WebSocket with player
                const session = this.sessions.find(s => s.webSocket === ws);
                if (session) {
                    session.playerId = newPlayer.id;
                }

                const existingIdx = this.gameState.players.findIndex(p => p.id === newPlayer.id);
                if (existingIdx === -1) {
                    this.gameState.players.push(newPlayer);
                }

                await this.saveAndBroadcast();
                break;

            case 'START':
                if (this.gameState.status !== 'waiting') return;
                if (this.gameState.players.length < 2) return;

                const deck = createDeck();

                this.gameState.players.forEach(player => {
                    player.hand = deck.splice(0, 7);
                });

                let firstCard = deck.shift()!;
                while (firstCard.color === 'wild') {
                    deck.push(firstCard);
                    firstCard = deck.shift()!;
                }

                this.gameState.discardPile = [firstCard];
                this.gameState.currentColor = firstCard.color;
                this.gameState.deckCount = deck.length;
                (this.gameState as any).fullDeck = deck;

                this.gameState.status = 'playing';
                this.gameState.turnIndex = 0;

                await this.saveAndBroadcast();
                break;

            case 'PLAY_CARD':
                if (this.gameState.status !== 'playing') return;

                const { playerId, card } = action.payload;
                const player = this.gameState.players.find(p => p.id === playerId);
                const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];

                if (player && this.gameState.players[this.gameState.turnIndex].id === playerId) {
                    if (canPlayCard(card, topCard, this.gameState.currentColor)) {
                        player.hand = player.hand.filter(c => c.id !== card.id);
                        this.gameState.discardPile.push(card);

                        let advanceTurnSteps = 1;

                        if (card.value === 'skip') {
                            advanceTurnSteps = 2;
                        } else if (card.value === 'reverse') {
                            this.gameState.direction *= -1;
                            if (this.gameState.players.length === 2) {
                                advanceTurnSteps = 2;
                            }
                        } else if (card.value === 'draw_two') {
                            advanceTurnSteps = 2;
                            const nextPIdx = getNextTurnIndex(this.gameState.turnIndex, this.gameState.players.length, this.gameState.direction);
                            const nextPlayer = this.gameState.players[nextPIdx];
                            const fullDeck = (this.gameState as any).fullDeck as Card[];
                            if (fullDeck && fullDeck.length >= 2) {
                                nextPlayer.hand.push(...fullDeck.splice(0, 2));
                                this.gameState.deckCount = fullDeck.length;
                            }
                        } else if (card.value === 'wild_draw_four') {
                            advanceTurnSteps = 2;
                            const nextPIdx = getNextTurnIndex(this.gameState.turnIndex, this.gameState.players.length, this.gameState.direction);
                            const nextPlayer = this.gameState.players[nextPIdx];
                            const fullDeck = (this.gameState as any).fullDeck as Card[];
                            if (fullDeck && fullDeck.length >= 4) {
                                nextPlayer.hand.push(...fullDeck.splice(0, 4));
                                this.gameState.deckCount = fullDeck.length;
                            }
                        }

                        for (let i = 0; i < advanceTurnSteps; i++) {
                            this.gameState.turnIndex = getNextTurnIndex(this.gameState.turnIndex, this.gameState.players.length, this.gameState.direction);
                        }

                        if (card.color !== 'wild') {
                            this.gameState.currentColor = card.color;
                        } else {
                            this.gameState.currentColor = action.payload.chosenColor || 'red';
                        }

                        if (player.hand.length === 0) {
                            this.gameState.status = 'finished';
                            this.gameState.winnerId = player.id;
                        }

                        await this.saveAndBroadcast();
                    }
                }
                break;

            case 'SAY_UNO':
                const shouter = this.gameState.players.find(p => p.id === action.payload.playerId);
                if (shouter && shouter.hand.length === 1) {
                    this.broadcast({ type: 'NOTIFICATION', message: `${shouter.name} shouted UNO!` });
                }
                break;

            case 'DRAW_CARD':
                const fullDeck = (this.gameState as any).fullDeck as Card[];
                if (fullDeck && fullDeck.length > 0) {
                    const drawPlayer = this.gameState.players.find(p => p.id === action.payload.playerId);
                    if (drawPlayer && this.gameState.players[this.gameState.turnIndex].id === drawPlayer.id) {
                        const drawnCard = fullDeck.shift();
                        if (drawnCard) {
                            drawPlayer.hand.push(drawnCard);
                            this.gameState.deckCount = fullDeck.length;
                        }

                        // Advance turn after drawing
                        this.gameState.turnIndex = getNextTurnIndex(
                            this.gameState.turnIndex,
                            this.gameState.players.length,
                            this.gameState.direction
                        );

                        await this.saveAndBroadcast();
                    }
                }
                break;
        }
    }

    private async saveAndBroadcast() {
        // Save state (but not the full deck to save space)
        const stateToSave = { ...this.gameState };
        delete (stateToSave as any).fullDeck;
        await this.state.storage.put('gameState', stateToSave);

        this.broadcastState();
    }

    private broadcastState() {
        const sanitizedState = JSON.parse(JSON.stringify(this.gameState));
        delete sanitizedState.fullDeck;

        const message = JSON.stringify({ type: 'STATE_UPDATE', payload: sanitizedState });

        for (const session of this.sessions) {
            try {
                session.webSocket.send(message);
            } catch (e) {
                // WebSocket may be closed
            }
        }
    }

    private broadcast(message: any) {
        const data = JSON.stringify(message);
        for (const session of this.sessions) {
            try {
                session.webSocket.send(data);
            } catch (e) {
                // WebSocket may be closed
            }
        }
    }
}
