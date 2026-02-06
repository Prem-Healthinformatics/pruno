import type { GameState, Player, Card } from '@pruno/shared';
import { createDeck, canPlayCard, getNextTurnIndex, calculateHandPoints } from '@pruno/shared';

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
                // Check for existing player (reconnecting)
                const existingPlayer = this.gameState.players.find(p => p.id === action.payload.id);

                if (existingPlayer) {
                    // Player is reconnecting
                    // Update attachment just in case
                    try {
                        ws.serializeAttachment({ playerId: existingPlayer.id });
                    } catch (e) {
                        // Ignore attachment errors
                    }

                    // Send them the current state immediately
                    const sanitizedState = JSON.parse(JSON.stringify(this.gameState));
                    delete sanitizedState.fullDeck;
                    ws.send(JSON.stringify({
                        type: 'STATE_UPDATE',
                        payload: sanitizedState
                    }));
                    return;
                }

                // New player trying to join
                if (this.gameState.status !== 'waiting') {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Game already in progress' }));
                    return;
                }

                if (this.gameState.players.length >= 6) {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room full' }));
                    return;
                }

                const newPlayer: Player = {
                    id: action.payload.id || crypto.randomUUID(),
                    name: action.payload.name || 'Guest',
                    hand: [],
                    score: 0,
                    hasDrawn: false
                };

                // Associate WebSocket with player using Attachment API for persistence
                try {
                    ws.serializeAttachment({ playerId: newPlayer.id });
                } catch (e) {
                    // Fallback or ignore
                }

                // Keep session array for backward compat or quick lookups if needed, 
                // but rely on getWebSockets() for broadcast
                const session = this.sessions.find(s => s.webSocket === ws);
                if (session) {
                    session.playerId = newPlayer.id;
                }

                this.gameState.players.push(newPlayer);
                await this.saveAndBroadcast();
                break;

            case 'START':
                if (this.gameState.status !== 'waiting') return;
                if (this.gameState.players.length < 2) return;

                const deck = createDeck();

                this.gameState.players.forEach(player => {
                    player.hand = deck.splice(0, 7);
                    player.saidUno = false;
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


                        // Advance turn
                        let advanceTurnSteps = 1;
                        this.gameState.players.forEach(p => p.hasDrawn = false);

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

                        if (player.hand.length > 1) {
                            player.saidUno = false;
                        }

                        if (player.hand.length === 0) {
                            // Round Over! Calculate scores
                            let points = 0;
                            this.gameState.players.forEach(p => {
                                if (p.id !== player.id) {
                                    points += calculateHandPoints(p.hand);
                                }
                            });

                            player.score = (player.score || 0) + points;
                            this.gameState.winnerId = player.id; // Round Winner

                            if (player.score >= 500) {
                                this.gameState.status = 'finished';
                                this.gameState.matchWinnerId = player.id;
                            } else {
                                this.gameState.status = 'round_over';
                            }
                        }

                        await this.saveAndBroadcast();
                    }
                }
                break;

            case 'SAY_UNO':
                const shouter = this.gameState.players.find(p => p.id === action.payload.playerId);
                // Allow shouting if they have 1 or 2 cards (anticipating the play)
                if (shouter && shouter.hand.length <= 2) {
                    shouter.saidUno = true;
                    this.broadcast({ type: 'NOTIFICATION', message: `${shouter.name} shouted UNO!` });
                    // Broadcast state to update UI (show they said it)
                    await this.saveAndBroadcast();
                }
                break;

            case 'CATCH_UNO':
                const catcher = this.gameState.players.find(p => p.id === action.payload.playerId);
                const target = this.gameState.players.find(p => p.id === action.payload.targetId);

                if (catcher && target && target.hand.length === 1 && !target.saidUno) {
                    // Penalty!
                    const fullDeck = (this.gameState as any).fullDeck as Card[];
                    if (fullDeck && fullDeck.length >= 2) {
                        target.hand.push(...fullDeck.splice(0, 2));
                        this.gameState.deckCount = fullDeck.length;
                        target.saidUno = false; // Reset

                        this.broadcast({ type: 'NOTIFICATION', message: `${catcher.name} caught ${target.name} not saying UNO! (+2 cards)` });
                        await this.saveAndBroadcast();
                    }
                }
                break;

            case 'DRAW_CARD':
                const fullDeck = (this.gameState as any).fullDeck as Card[];
                if (fullDeck && fullDeck.length > 0) {
                    const drawPlayer = this.gameState.players.find(p => p.id === action.payload.playerId);
                    if (drawPlayer && this.gameState.players[this.gameState.turnIndex].id === drawPlayer.id) {

                        // If already drawn, cannot draw again (force pass usually, but button should be disabled)
                        // Actually rules allow drawing instead of playing. Mmm. 
                        // But if you drew once and it was playable, you must PLAY or PASS. Not Draw again.
                        if (drawPlayer.hasDrawn) {
                            return;
                        }

                        const drawnCard = fullDeck.shift();
                        if (drawnCard) {
                            drawPlayer.hand.push(drawnCard);
                            drawPlayer.saidUno = false; // Safety reset
                            this.gameState.deckCount = fullDeck.length;

                            // Check if playable
                            const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];
                            const isPlayable = canPlayCard(drawnCard, topCard, this.gameState.currentColor);

                            if (isPlayable) {
                                // User CAN play this card.
                                // Do NOT advance turn. Mark as hasDrawn.
                                drawPlayer.hasDrawn = true;
                                this.broadcast({ type: 'NOTIFICATION', message: `${drawPlayer.name} drew a card and can play it!` });
                            } else {
                                // Cannot play. Auto-pass.
                                this.broadcast({ type: 'NOTIFICATION', message: `${drawPlayer.name} drew a card (skipping turn).` });
                                this.gameState.turnIndex = getNextTurnIndex(
                                    this.gameState.turnIndex,
                                    this.gameState.players.length,
                                    this.gameState.direction
                                );
                                drawPlayer.hasDrawn = false; // Reset
                            }
                        } else {
                            // Deck empty? Should reshuffle (todo)
                        }

                        await this.saveAndBroadcast();
                    }
                }
                break;

            case 'PASS_TURN':
                const passPlayer = this.gameState.players.find(p => p.id === action.payload.playerId);
                if (passPlayer &&
                    this.gameState.players[this.gameState.turnIndex].id === passPlayer.id &&
                    passPlayer.hasDrawn) {

                    // User chose to pass after drawing a playable card
                    this.broadcast({ type: 'NOTIFICATION', message: `${passPlayer.name} passed.` });

                    passPlayer.hasDrawn = false;
                    this.gameState.turnIndex = getNextTurnIndex(
                        this.gameState.turnIndex,
                        this.gameState.players.length,
                        this.gameState.direction
                    );
                    await this.saveAndBroadcast();
                }
                break;

            case 'NEXT_ROUND':
                if (this.gameState.status !== 'round_over') return;

                // Reset for next round
                const newDeck = createDeck();

                // Deal 7 cards to everyone
                this.gameState.players.forEach(player => {
                    player.hand = newDeck.splice(0, 7);
                    player.saidUno = false;
                });

                // Start card
                let fCard = newDeck.shift()!;
                while (fCard.color === 'wild') {
                    newDeck.push(fCard);
                    fCard = newDeck.shift()!;
                }

                this.gameState.discardPile = [fCard];
                this.gameState.currentColor = fCard.color;
                this.gameState.deckCount = newDeck.length;
                (this.gameState as any).fullDeck = newDeck;

                this.gameState.status = 'playing';
                this.gameState.turnIndex = 0;
                this.gameState.direction = 1;
                this.gameState.winnerId = undefined; // Clear round winner

                await this.saveAndBroadcast();
                break;

            case 'CHAT':
                // Broadcast encrypted chat message to all players
                // Server doesn't decrypt - just passes through the encrypted message
                const sender = this.gameState.players.find(p => p.id === action.payload.playerId);
                if (sender) {
                    this.broadcast({
                        type: 'CHAT_MESSAGE',
                        payload: {
                            senderId: sender.id,
                            senderName: sender.name,
                            encryptedMessage: action.payload.encryptedMessage,
                            timestamp: Date.now()
                        }
                    });
                }
                break;
        }
    }

    private async saveAndBroadcast() {
        // Save state INCLUDING the full deck so it persists across server restarts
        await this.state.storage.put('gameState', this.gameState);

        this.broadcastState();
    }

    private broadcastState() {
        const sanitizedState = JSON.parse(JSON.stringify(this.gameState));
        delete sanitizedState.fullDeck;

        const message = JSON.stringify({ type: 'STATE_UPDATE', payload: sanitizedState });

        // Robust broadcast using getWebSockets() to reach all connections, 
        // even those not in the volatile 'sessions' array (e.g. after Isolate reset)
        for (const ws of this.state.getWebSockets()) {
            try {
                ws.send(message);
            } catch (e) {
                // Socket dead
            }
        }
    }

    private broadcast(message: any) {
        const data = JSON.stringify(message);
        for (const ws of this.state.getWebSockets()) {
            try {
                ws.send(data);
            } catch (e) {
                // Socket dead
            }
        }
    }
}
