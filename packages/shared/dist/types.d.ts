export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type Value = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';
export interface Card {
    id: string;
    color: Color;
    value: Value;
}
export interface Player {
    id: string;
    name: string;
    saidUno?: boolean;
    score?: number;
    hasDrawn?: boolean;
}
export interface GameState {
    roomId: string;
    players: Player[];
    deckCount: number;
    discardPile: Card[];
    turnIndex: number;
    direction: 1 | -1;
    status: 'waiting' | 'playing' | 'round_over' | 'finished';
    winnerId?: string;
    matchWinnerId?: string;
    currentColor: Color;
}
export interface GameAction {
    type: 'JOIN' | 'START' | 'PLAY_CARD' | 'DRAW_CARD' | 'SAY_UNO' | 'CATCH_UNO' | 'NEXT_ROUND' | 'PASS_TURN';
    payload?: any;
}
