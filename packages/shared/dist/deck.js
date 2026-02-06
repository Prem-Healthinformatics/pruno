"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffleDeck = exports.createDeck = void 0;
const uuid_1 = require("uuid");
const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES_0_9 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const SPECIALS = ['skip', 'reverse', 'draw_two'];
const WILDS = ['wild', 'wild_draw_four'];
const createDeck = () => {
    const deck = [];
    // Normal colors
    COLORS.forEach(color => {
        // One 0 per color
        deck.push({ id: (0, uuid_1.v4)(), color, value: '0' });
        // Two of 1-9 per color
        for (let i = 0; i < 2; i++) {
            VALUES_0_9.filter(v => v !== '0').forEach(value => {
                deck.push({ id: (0, uuid_1.v4)(), color, value });
            });
        }
        // Two of each special per color
        for (let i = 0; i < 2; i++) {
            SPECIALS.forEach(value => {
                deck.push({ id: (0, uuid_1.v4)(), color, value });
            });
        }
    });
    // Wild cards (4 of each)
    for (let i = 0; i < 4; i++) {
        WILDS.forEach(value => {
            deck.push({ id: (0, uuid_1.v4)(), color: 'wild', value });
        });
    }
    return (0, exports.shuffleDeck)(deck);
};
exports.createDeck = createDeck;
const shuffleDeck = (deck) => {
    return [...deck].sort(() => Math.random() - 0.5);
};
exports.shuffleDeck = shuffleDeck;
