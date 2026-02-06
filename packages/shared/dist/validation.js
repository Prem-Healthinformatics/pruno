"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextTurnIndex = exports.canPlayCard = void 0;
const canPlayCard = (card, topCard, currentColor) => {
    // Wild cards can always be played
    if (card.color === 'wild')
        return true;
    // Match color (use currentColor for active wild effects)
    if (card.color === currentColor)
        return true;
    // Match value/symbol
    if (card.value === topCard.value)
        return true;
    // Special case: if top card is wild, we must check if the declared color matches card color.
    // Although checking `currentColor` handles this, explicitly: 
    if (topCard.color === 'wild' && card.color === currentColor)
        return true;
    return false;
};
exports.canPlayCard = canPlayCard;
const getNextTurnIndex = (currentIndex, playerCount, direction) => {
    // Handle wrap-around with modulo arithmetic that works for negatives
    return (currentIndex + direction + playerCount) % playerCount;
};
exports.getNextTurnIndex = getNextTurnIndex;
