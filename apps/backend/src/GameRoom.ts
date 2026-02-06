import { WebSocket } from 'ws';
import type { GameState, Player, Card } from '@pruno/shared';
import { createDeck, canPlayCard, getNextTurnIndex } from '@pruno/shared';

// Helper for broadcasting
const broadcast = (connections: WebSocket[], message: any) => {
    const data = JSON.stringify(message);
    connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });
};

export class GameRoom {
    sessions: WebSocket[] = [];
    gameState: GameState;
    roomId: string;

    constructor(roomId: string) {
        this.roomId = roomId;
        this.gameState = {
            roomId: roomId,
            players: [],
            deckCount: 0,
            discardPile: [],
            turnIndex: 0,
            direction: 1,
            status: 'waiting',
            currentColor: 'red'
        };
    }

    handleConnection(ws: WebSocket) {
        this.sessions.push(ws);

        ws.on('message', (data) => {
            try {
                const action = JSON.parse(data.toString());
                this.handleAction(ws, action);
            } catch (e) {
                console.error("Error parsing message", e);
            }
        });

        ws.on('close', () => {
            this.sessions = this.sessions.filter(s => s !== ws);
        });
    }

    handleAction(ws: WebSocket, action: any) {
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

                const existingIdx = this.gameState.players.findIndex(p => p.id === newPlayer.id);
                if (existingIdx === -1) {
                    this.gameState.players.push(newPlayer);
                }

                this.broadcastState();
                break;

            case 'START':
                if (this.gameState.status !== 'waiting') return;
                if (this.gameState.players.length < 1) return;

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

                this.broadcastState();
                break;

            case 'PLAY_CARD':
                if (this.gameState.status !== 'playing') return;

                const { playerId, card } = action.payload;
                const player = this.gameState.players.find(p => p.id === playerId);
                const topCard = this.gameState.discardPile[this.gameState.discardPile.length - 1];

                if (player && this.gameState.players[this.gameState.turnIndex].id === playerId) {
                    if (canPlayCard(card, topCard, this.gameState.currentColor)) {
                        // Remove card from hand
                        player.hand = player.hand.filter(c => c.id !== card.id);
                        this.gameState.discardPile.push(card);

                        // Handle Special Card Effects
                        let advanceTurnBytes = 1;

                        if (card.value === 'skip') {
                            advanceTurnBytes = 2; // Skip next player
                        } else if (card.value === 'reverse') {
                            this.gameState.direction *= -1;
                            if (this.gameState.players.length === 2) {
                                advanceTurnBytes = 2; // In 2-player, reverse acts like skip
                            }
                        } else if (card.value === 'draw_two') {
                            advanceTurnBytes = 2; // Skip next player who draws
                            const nextPIdx = getNextTurnIndex(this.gameState.turnIndex, this.gameState.players.length, this.gameState.direction);
                            const nextPlayer = this.gameState.players[nextPIdx];
                            const fullDeck = (this.gameState as any).fullDeck as Card[];
                            nextPlayer.hand.push(...fullDeck.splice(0, 2));
                            this.gameState.deckCount = fullDeck.length;
                        } else if (card.value === 'wild_draw_four') {
                            advanceTurnBytes = 2; // Skip next player who draws
                            const nextPIdx = getNextTurnIndex(this.gameState.turnIndex, this.gameState.players.length, this.gameState.direction);
                            const nextPlayer = this.gameState.players[nextPIdx];
                            const fullDeck = (this.gameState as any).fullDeck as Card[];
                            nextPlayer.hand.push(...fullDeck.splice(0, 4));
                            this.gameState.deckCount = fullDeck.length;
                        }

                        // Update turn based on calculated steps (usually 1, or 2 if skipped)
                        for (let i = 0; i < advanceTurnBytes; i++) {
                            this.gameState.turnIndex = getNextTurnIndex(this.gameState.turnIndex, this.gameState.players.length, this.gameState.direction);
                        }

                        if (card.color !== 'wild') {
                            this.gameState.currentColor = card.color;
                        } else {
                            this.gameState.currentColor = action.payload.chosenColor || 'red';
                        }

                        // Check Game Over
                        if (player.hand.length === 0) {
                            this.gameState.status = 'finished';
                            this.gameState.winnerId = player.id;
                        }

                        this.broadcastState();
                    }
                }
                break;

            case 'SAY_UNO':
                const shouter = this.gameState.players.find(p => p.id === action.payload.playerId);
                if (shouter && shouter.hand.length === 1) {
                    broadcast(this.sessions, { type: 'NOTIFICATION', message: `${shouter.name} shouted UNO!` });
                }
                break;

            case 'DRAW_CARD':
                const fullDeck = (this.gameState as any).fullDeck as Card[];
                if (fullDeck && fullDeck.length > 0) {
                    const player = this.gameState.players.find(p => p.id === action.payload.playerId);
                    if (player && this.gameState.players[this.gameState.turnIndex].id === player.id) {
                        // Draw exactly ONE card
                        const drawnCard = fullDeck.shift();
                        if (drawnCard) {
                            player.hand.push(drawnCard);
                            this.gameState.deckCount = fullDeck.length;
                        }

                        // After drawing, advance the turn (official Uno rules)
                        // Player drew and their turn is now over
                        this.gameState.turnIndex = getNextTurnIndex(
                            this.gameState.turnIndex,
                            this.gameState.players.length,
                            this.gameState.direction
                        );

                        this.broadcastState();
                    }
                }
                break;
        }
    }

    broadcastState() {
        const sanitizedState = JSON.parse(JSON.stringify(this.gameState));
        delete sanitizedState.fullDeck;

        this.sessions.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'STATE_UPDATE', payload: sanitizedState }));
            }
        });
    }
}
