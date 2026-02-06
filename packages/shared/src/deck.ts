import { Card, Color, Value } from './types';
import { v4 as uuidv4 } from 'uuid';

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const VALUES_0_9: Value[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SPECIALS: Value[] = ['skip', 'reverse', 'draw_two'];
const WILDS: Value[] = ['wild', 'wild_draw_four'];

export const createDeck = (): Card[] => {
    const deck: Card[] = [];

    // Normal colors
    COLORS.forEach(color => {
        // One 0 per color
        deck.push({ id: uuidv4(), color, value: '0' });

        // Two of 1-9 per color
        for (let i = 0; i < 2; i++) {
            VALUES_0_9.filter(v => v !== '0').forEach(value => {
                deck.push({ id: uuidv4(), color, value });
            });
        }

        // Two of each special per color
        for (let i = 0; i < 2; i++) {
            SPECIALS.forEach(value => {
                deck.push({ id: uuidv4(), color, value });
            });
        }
    });

    // Wild cards (4 of each)
    for (let i = 0; i < 4; i++) {
        WILDS.forEach(value => {
            deck.push({ id: uuidv4(), color: 'wild', value });
        });
    }

    return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
    return [...deck].sort(() => Math.random() - 0.5);
};
