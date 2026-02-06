
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

    // Initial Loading/Connecting States
    if (!isConnected) {
        return (
            <div className="min-h-screen h-[100dvh] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 md:w-16 md:h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-white text-lg md:text-xl">Connecting to Room <span className="font-bold text-purple-400">{roomId}</span>...</p>
                </div>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="min-h-screen h-[100dvh] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
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
        <div className="h-[100dvh] w-full bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex flex-col overflow-hidden relative touch-none">

            {/* Header: Room Code & Turn (Compact) */}
            <div className="flex justify-between items-start md:items-center p-3 md:p-6 z-30 pointer-events-none">
                {/* Room Code with Copy Button */}
                <div className="bg-black/40 backdrop-blur-md p-1.5 md:p-2 rounded-xl border border-white/10 pointer-events-auto flex items-center gap-2 md:gap-3 shadow-lg">
                    <div className="px-2">
                        <span className="text-[10px] md:text-xs text-white/60 uppercase tracking-widest block">Room Code</span>
                        <span className="text-xl md:text-2xl font-black text-white tracking-widest leading-none font-mono">{roomId}</span>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(roomId);
                            // Simple visual feedback could be added here
                        }}
                        className="bg-white/10 hover:bg-white/20 active:bg-white/30 p-2 rounded-lg transition-colors"
                        title="Copy Code"
                    >
                        📋
                    </button>
                </div>

                {gameState.status === 'playing' && (
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-white/10 text-right shadow-lg pointer-events-auto">
                        <span className="text-[10px] md:text-xs text-white/60 uppercase tracking-widest block">Current Turn</span>
                        <span className={`text-base md:text-xl font-bold ${isMyTurn ? 'text-green-400 animate-pulse' : 'text-white'}`}>
                            {isMyTurn ? '🎯 YOUR TURN' : currentPlayer?.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Opponents Area: Horizontal Scroll */}
            <div className="flex-1 flex justify-center items-start pt-2 px-2 overflow-x-auto overflow-y-hidden no-scrollbar w-full z-20">
                <div className="flex gap-3 md:gap-6 px-4">
                    {others.map(player => {
                        const isTheirTurn = gameState.players[gameState.turnIndex]?.id === player.id;
                        const canCatch = player.hand.length === 1 && !player.saidUno;

                        return (
                            <motion.div
                                key={player.id}
                                animate={{ scale: isTheirTurn ? 1.05 : 1 }}
                                className={`relative flex flex-col items-center p-2 md:p-3 rounded-xl min-w-[70px] md:min-w-[100px] transition-colors ${isTheirTurn ? 'bg-yellow-500/20 ring-1 ring-yellow-400' : 'bg-black/20'}`}
                            >
                                {/* Said UNO indicator */}
                                {player.saidUno && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg z-20 whitespace-nowrap">
                                        UNO!
                                    </div>
                                )}

                                {/* Catch Button */}
                                {canCatch && (
                                    <motion.button
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => sendAction({ type: 'CATCH_UNO', payload: { playerId, targetId: player.id } })}
                                        className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 border border-white text-white text-[10px] font-black px-2 py-1 rounded-full shadow-xl z-30 animate-pulse whitespace-nowrap hover:scale-110"
                                    >
                                        CATCH!
                                    </motion.button>
                                )}

                                <div className="relative">
                                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-sm md:text-xl mb-1 shadow-lg ${isTheirTurn ? 'bg-yellow-400 text-black' : 'bg-indigo-600 text-white'}`}>
                                        {player.name[0].toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[10px] px-1.5 rounded-full border border-gray-600">
                                        {player.hand.length}
                                    </div>
                                </div>
                                <span className="text-xs md:text-sm text-white font-medium mt-1 truncate max-w-[80px] text-center">
                                    {player.name}
                                </span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Center Play Area */}
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 z-10 w-full px-4 -mt-10 md:mt-0">
                <div className="flex items-center gap-6 md:gap-12 scale-75 md:scale-100 origin-center">

                    {/* Draw Pile */}
                    <motion.div
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            if (isMyTurn) {
                                playSound('draw');
                                sendAction({ type: 'DRAW_CARD', payload: { playerId } });
                            }
                        }}
                        className={`w-24 h-36 md:w-32 md:h-48 bg-gradient-to-br from-red-700 to-red-900 rounded-xl border-4 border-white shadow-2xl cursor-pointer flex flex-col items-center justify-center relative group ${!isMyTurn ? 'opacity-80' : 'hover:scale-105'}`}
                    >
                        <span className="text-3xl md:text-5xl font-black text-white/90 bg-white/10 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center transform -rotate-12 group-hover:rotate-0 transition-transform">
                            UNO
                        </span>
                        <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                        <span className="absolute -bottom-8 text-white/60 text-xs md:text-sm font-medium">Draw</span>
                    </motion.div>

                    {/* Discard Pile */}
                    <div className="relative w-24 h-36 md:w-32 md:h-48 perspective-500">
                        <div className="w-full h-full bg-black/20 rounded-xl border-2 border-dashed border-white/20 absolute inset-0 transform translate-y-2"></div>
                        <AnimatePresence mode='popLayout'>
                            {topCard && (
                                <motion.div
                                    key={topCard.id} // Re-render on new card
                                    initial={{ scale: 0.5, y: -50, opacity: 0, rotate: Math.random() * 20 - 10 }}
                                    animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                                    className="absolute inset-0 cursor-default"
                                >
                                    <div className="pointer-events-none transform hover:scale-110 transition-transform">
                                        <Card card={topCard} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </div>

                {/* Status / Color Indicator */}
                <div className="md:absolute md:right-12 md:top-1/2 md:-translate-y-1/2 flex flex-row md:flex-col items-center gap-3">
                    <div className="relative group">
                        <div
                            className="w-10 h-10 md:w-16 md:h-16 rounded-full border-4 border-white shadow-lg transition-colors duration-500"
                            style={{ backgroundColor: colorStyles[gameState.currentColor] }}
                            title="Current Color"
                        ></div>
                        {/* Glow effect */}
                        <div
                            className="absolute inset-0 rounded-full blur-xl opacity-50 transition-colors duration-500"
                            style={{ backgroundColor: colorStyles[gameState.currentColor] }}
                        ></div>
                    </div>
                    <span className="text-xs md:text-sm text-white/60 font-medium uppercase tracking-wider backdrop-blur-md bg-black/20 px-2 py-1 rounded">
                        Active Color
                    </span>
                </div>
            </div>

            {/* Waiting: Start Game Button */}
            {gameState.status === 'waiting' && <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendAction({ type: 'START' })}
                    className="pointer-events-auto px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-2xl rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-green-400"
                >
                    START GAME
                </motion.button>
            </div>}

            {/* Player's Hand Area */}
            <div className="w-full flex flex-col items-center pb-safe-area z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-4 md:pt-8 min-h-[160px] md:min-h-[220px]">

                {/* Controls */}
                <div className="flex gap-4 mb-2 md:mb-4 relative">
                    {/* Self Said UNO Indicator */}
                    {me && me.saidUno && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-lg z-20 whitespace-nowrap animate-bounce">
                            YOU SAID UNO!
                        </div>
                    )}

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => sendAction({ type: 'SAY_UNO', payload: { playerId } })}
                        disabled={!me || me.hand.length > 2 || me.saidUno}
                        className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-sm md:text-lg shadow-lg flex items-center gap-2 ${me && me.hand.length <= 2 && !me.saidUno
                            ? 'bg-orange-500 text-white animate-bounce'
                            : 'bg-gray-700/50 text-white/30 cursor-not-allowed'
                            }`}
                    >
                        <span>📢</span> SHOUT UNO
                    </motion.button>

                    {/* PASS Button (only visible if drawn) */}
                    {isMyTurn && me?.hasDrawn && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => sendAction({ type: 'PASS_TURN', payload: { playerId } } as any)}
                            className="px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold text-sm md:text-lg shadow-lg flex items-center gap-2 bg-gray-600 text-white hover:bg-gray-500"
                        >
                            <span>⏭️</span> PASS
                        </motion.button>
                    )}
                </div>

                {/* Scrollable Hand */}
                <div className="w-full overflow-x-auto overflow-y-visible px-4 md:px-8 pb-4 flex justify-center no-scrollbar">
                    <div className="flex items-end -space-x-8 md:-space-x-12 px-8 min-w-fit">
                        <AnimatePresence mode="popLayout">
                            {me?.hand.map((card, index) => {
                                const isPlayable = isMyTurn && (
                                    card.color === 'wild' ||
                                    card.color === gameState.currentColor ||
                                    card.value === topCard.value // Explicit client-side check for UI feedback
                                );

                                return (
                                    <motion.div
                                        key={card.id}
                                        layout
                                        initial={{ y: 100, opacity: 0, rotate: 10 }}
                                        animate={{
                                            y: isPlayable ? -10 : 0, // Lift playable cards slightly
                                            opacity: 1,
                                            rotate: (index - (me.hand.length - 1) / 2) * (me.hand.length > 8 ? 2 : 4),
                                            scale: 1,
                                            zIndex: index
                                        }}
                                        whileHover={{ y: -30, rotate: 0, scale: 1.1, zIndex: 100 }}
                                        whileTap={{ y: -40, scale: 1.05 }}
                                        className={`transform-gpu relative transition-all duration-200 ${!isPlayable && isMyTurn ? 'brightness-50 grayscale-[0.5]' : ''}`}
                                    >
                                        <div className="w-20 md:w-32 cursor-pointer" onClick={() => handlePlayCard(card)}>
                                            <Card card={card} />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="text-white/50 text-xs md:text-sm font-medium">
                    {me ? (isMyTurn ? (me.hasDrawn ? "Play your drawn card or Pass" : "Select a card to play") : "Waiting for your turn...") : "Spectating"}
                </div>
            </div>

            {/* Color Picker Modal */}
            <AnimatePresence>
                {showColorPicker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                            className="bg-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm"
                        >
                            <h2 className="text-white text-xl md:text-2xl font-bold mb-6 text-center">Choose Color</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {(['red', 'blue', 'green', 'yellow'] as const).map(c => (
                                    <motion.button
                                        key={c}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => handleColorPick(c)}
                                        className="h-24 rounded-2xl shadow-inner relative overflow-hidden group border-2 border-transparent hover:border-white transition-all"
                                        style={{ backgroundColor: colorStyles[c] }}
                                    >
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Round Over / Game Over Modal */}
            <AnimatePresence>
                {(gameState.status === 'finished' || gameState.status === 'round_over') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/90 z-[70] flex flex-col items-center justify-center p-4 text-center"
                    >
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 animate-bounce">
                            {gameState.status === 'finished' ? 'GAME OVER' : 'ROUND OVER'}
                        </h1>

                        <div className="text-2xl md:text-4xl font-bold mb-4" style={{ color: gameState.winnerId === playerId ? '#22c55e' : '#eab308' }}>
                            {gameState.winnerId === playerId ? "🏆 YOU WON THE ROUND! 🏆" : `${gameState.players.find(p => p.id === gameState.winnerId)?.name} WINS THE ROUND!`}
                        </div>

                        {/* Score Board */}
                        <div className="bg-white/10 p-6 rounded-2xl mb-8 min-w-[300px]">
                            <h3 className="text-white text-xl font-bold mb-4 border-b border-white/20 pb-2">SCORES</h3>
                            <div className="flex flex-col gap-2">
                                {gameState.players.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-white">
                                        <span>{p.name} {p.id === gameState.winnerId && '👑'}</span>
                                        <span className="font-mono font-bold text-yellow-400">{p.score || 0} pts</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-xs text-white/50">First to 500 wins!</div>
                        </div>

                        {gameState.status === 'finished' ? (
                            <button
                                onClick={() => window.location.reload()}
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-white text-xl shadow-lg hover:scale-105 transition-transform"
                            >
                                Play Again
                            </button>
                        ) : (
                            <button
                                onClick={() => sendAction({ type: 'NEXT_ROUND' } as any)}
                                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl font-bold text-white text-xl shadow-lg hover:scale-105 transition-transform"
                            >
                                Start Next Round ➡️
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Encrypted Chat */}
            <Chat roomId={roomId} playerId={playerId} onSendMessage={sendChatMessage} incomingMessages={chatMessages} />
        </div >
    );
};
