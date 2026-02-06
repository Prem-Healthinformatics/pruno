
export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

export interface Card {
    id: string; // Unique ID for React keys and tracking
    color: Color;
    value: Value;
}

export interface Player {
    id: string; // Guest ID or Socket ID
    name: string;
    hand: Card[];
    isAudience?: boolean;
}

export interface GameState {
    roomId: string;
    players: Player[];
    deckCount: number; // Don't send full deck to clients to prevent cheating
    discardPile: Card[]; // Top card is visible
    turnIndex: number;
    direction: 1 | -1; // 1 = Clockwise, -1 = Counter-Clockwise
    status: 'waiting' | 'playing' | 'finished';
    winnerId?: string;
    currentColor: Color; // For wild cards, the chosen color
}

export interface GameAction {
    type: 'JOIN' | 'START' | 'PLAY_CARD' | 'DRAW_CARD' | 'SAY_UNO';
    payload?: any;
}
