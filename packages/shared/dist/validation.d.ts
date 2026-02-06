import { Card, Color } from './types';
export declare const canPlayCard: (card: Card, topCard: Card, currentColor: Color) => boolean;
export declare const getNextTurnIndex: (currentIndex: number, playerCount: number, direction: 1 | -1) => number;
