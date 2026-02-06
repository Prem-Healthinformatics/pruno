
import { Card } from './types';

export const calculateHandPoints = (hand: Card[]): number => {
    return hand.reduce((total, card) => {
        if (!isNaN(parseInt(card.value))) {
            // Number cards (0-9)
            return total + parseInt(card.value);
        }

        if (['skip', 'reverse', 'draw_two'].includes(card.value)) {
            // Action cards
            return total + 20;
        }

        if (['wild', 'wild_draw_four'].includes(card.value)) {
            // Wild cards
            return total + 50;
        }

        // New special cards (if implemented later)
        return total;
    }, 0);
};
