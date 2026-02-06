
import { useState } from 'react';
import { useGameSocket } from '../hooks/useGameSocket';
import { Card } from './Card';
import { Chat } from './Chat';
import { AnimatePresence, motion } from 'framer-motion';
import { playSound } from '../utils/sound';
import type { Card as CardType } from '@pruno/shared';

const colorStyles: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
};

export const GameBoard = ({ roomId, playerName }: { roomId: string; playerName: string }) => {
    const { gameState, isConnected, sendAction, sendChatMessage, chatMessages, playerId } = useGameSocket(roomId, playerName);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingCard, setPendingCard] = useState<CardType | null>(null);

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-white text-xl">Connecting to Room <span className="font-bold text-purple-400">{roomId}</span>...</p>
                </div>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <p className="text-white text-xl">Waiting for game state...</p>
            </div>
        );
    }

    const me = gameState.players.find(p => p.id === playerId);
    const others = gameState.players.filter(p => p.id !== playerId);
    const isMyTurn = gameState.status === 'playing' && gameState.players[gameState.turnIndex]?.id === playerId;
    const currentPlayer = gameState.players[gameState.turnIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    const handlePlayCard = (card: CardType) => {
        if (!isMyTurn) return;
        if (card.color === 'wild') {
            setPendingCard(card);
            setShowColorPicker(true);
        } else {
            playSound('play');
            sendAction({ type: 'PLAY_CARD', payload: { playerId, card } });
        }
    };

    const handleColorPick = (color: 'red' | 'blue' | 'green' | 'yellow') => {
        if (pendingCard) {
            playSound('play');
            sendAction({ type: 'PLAY_CARD', payload: { playerId, card: pendingCard, chosenColor: color } });
            setShowColorPicker(false);
            setPendingCard(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex flex-col items-center justify-between p-4 overflow-hidden relative">

            {/* Room Code Badge */}
            <div className="absolute top-4 left-4 z-50 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <span className="text-xs text-white/60 uppercase tracking-widest block">Room</span>
                <span className="text-2xl font-black text-white tracking-widest">{roomId}</span>
            </div>

            {/* Turn Indicator */}
            {gameState.status === 'playing' && (
                <div className="absolute top-4 right-4 z-50 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                    <span className="text-xs text-white/60 uppercase tracking-widest block">Current Turn</span>
                    <span className={`text-xl font-bold ${isMyTurn ? 'text-green-400' : 'text-white'}`}>
                        {isMyTurn ? '🎯 YOUR TURN!' : currentPlayer?.name}
                    </span>
                </div>
            )}

            {/* Opponents Area */}
            <div className="flex justify-center gap-6 py-4 w-full max-w-4xl">
                {others.map(player => {
                    const isTheirTurn = gameState.players[gameState.turnIndex]?.id === player.id;
                    return (
                        <motion.div
                            key={player.id}
                            animate={{ scale: isTheirTurn ? 1.05 : 1 }}
                            className={`flex flex-col items-center p-3 rounded-xl transition-all ${isTheirTurn ? 'bg-yellow-500/30 ring-2 ring-yellow-400' : 'bg-white/5'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-1 ${isTheirTurn ? 'bg-yellow-400 text-black' : 'bg-indigo-500 text-white'}`}>
                                {player.name[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-white font-medium">{player.name}</span>
                            <div className="flex -space-x-6 mt-2">
                                {player.hand.map((_, i) => (
                                    <div key={i} className="w-8 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-lg border-2 border-white/50 shadow-md" />
                                ))}
                            </div>
                            <span className="text-xs text-white/50 mt-1">{player.hand.length} cards</span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Center Play Area */}
            <div className="flex items-center gap-8 z-10 py-8">
                {/* Draw Pile */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        if (isMyTurn) {
                            playSound('draw');
                            sendAction({ type: 'DRAW_CARD', payload: { playerId } });
                        }
                    }}
                    className={`w-28 h-40 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl border-4 border-white shadow-2xl cursor-pointer flex flex-col items-center justify-center ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <span className="text-4xl font-black text-white bg-white/20 rounded-full w-14 h-14 flex items-center justify-center">UNO</span>
                    <span className="text-white/70 text-sm mt-2">{gameState.deckCount} left</span>
                </motion.div>

                {/* Discard Pile */}
                <div className="relative w-28 h-40">
                    <AnimatePresence>
                        {topCard && (
                            <motion.div
                                key={topCard.id}
                                initial={{ scale: 0.8, rotate: -10, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                className="absolute inset-0"
                            >
                                <Card card={topCard} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Current Color Indicator */}
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs text-white/60 uppercase tracking-widest">Active Color</span>
                    <div
                        className="w-16 h-16 rounded-full border-4 border-white shadow-xl transition-colors"
                        style={{ backgroundColor: colorStyles[gameState.currentColor] || '#000' }}
                    />
                </div>

                {/* Start Game Button (only in waiting) */}
                {gameState.status === 'waiting' && (
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => sendAction({ type: 'START' })}
                        className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black text-xl rounded-2xl shadow-2xl"
                    >
                        🎮 START GAME
                    </motion.button>
                )}
            </div>

            {/* Player's Hand */}
            <div className="w-full flex flex-col items-center pb-4 z-20">
                {/* UNO Shout Button */}
                {me && me.hand.length === 1 && isMyTurn && (
                    <motion.button
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        onClick={() => sendAction({ type: 'SAY_UNO', payload: { playerId } })}
                        className="mb-4 px-8 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-xl rounded-full shadow-2xl"
                    >
                        🔊 SHOUT UNO!
                    </motion.button>
                )}

                <div className="flex justify-center -space-x-8 hover:space-x-1 transition-all duration-300">
                    <AnimatePresence mode="popLayout">
                        {me?.hand.map((card, index) => (
                            <motion.div
                                key={card.id}
                                initial={{ y: 100, opacity: 0, rotate: -20 }}
                                animate={{ y: 0, opacity: 1, rotate: (index - (me.hand.length - 1) / 2) * 3 }}
                                exit={{ y: -100, opacity: 0, scale: 0.5 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            >
                                <Card
                                    card={card}
                                    onClick={() => handlePlayCard(card)}
                                    disabled={!isMyTurn}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                {me && <span className="text-white/50 text-sm mt-2">You have {me.hand.length} cards</span>}
            </div>

            {/* Color Picker Modal */}
            <AnimatePresence>
                {showColorPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.5 }}
                            className="bg-slate-800 p-8 rounded-3xl shadow-2xl"
                        >
                            <h2 className="text-white text-2xl font-bold mb-6 text-center">Choose a Color</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {(['red', 'blue', 'green', 'yellow'] as const).map(c => (
                                    <motion.button
                                        key={c}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleColorPick(c)}
                                        className="w-24 h-24 rounded-2xl shadow-lg border-4 border-white/30 transition-all hover:border-white"
                                        style={{ backgroundColor: colorStyles[c] }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Over Modal */}
            <AnimatePresence>
                {gameState.status === 'finished' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center"
                    >
                        <motion.h1
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.5 }}
                            className="text-7xl font-black text-white mb-6"
                        >
                            🎉 GAME OVER 🎉
                        </motion.h1>
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-5xl font-bold mb-8"
                            style={{ color: gameState.winnerId === playerId ? '#22c55e' : '#eab308' }}
                        >
                            {gameState.winnerId === playerId ? "🏆 YOU WON! 🏆" : `${gameState.players.find(p => p.id === gameState.winnerId)?.name} WINS!`}
                        </motion.div>
                        <motion.button
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => window.location.reload()}
                            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-white text-2xl shadow-2xl"
                        >
                            🔄 PLAY AGAIN
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Encrypted Chat */}
            <Chat
                roomId={roomId}
                playerId={playerId}
                onSendMessage={sendChatMessage}
                incomingMessages={chatMessages}
            />
        </div>
    );
};
