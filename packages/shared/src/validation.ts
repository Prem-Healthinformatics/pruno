import { Card, GameState, Color } from './types';

export const canPlayCard = (card: Card, topCard: Card, currentColor: Color): boolean => {
    // Wild cards can always be played
    if (card.color === 'wild') return true;

    // Match color (use currentColor for active wild effects)
    if (card.color === currentColor) return true;

    // Match value/symbol
    if (card.value === topCard.value) return true;

    // Special case: if top card is wild, we must check if the declared color matches card color.
    // Although checking `currentColor` handles this, explicitly: 
    if (topCard.color === 'wild' && card.color === currentColor) return true;

    return false;
};

export const getNextTurnIndex = (currentIndex: number, playerCount: number, direction: 1 | -1): number => {
    // Handle wrap-around with modulo arithmetic that works for negatives
    return (currentIndex + direction + playerCount) % playerCount;
};
