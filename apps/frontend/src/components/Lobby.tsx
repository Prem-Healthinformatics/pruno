
import { useState } from 'react';
import { motion } from 'framer-motion';

interface LobbyProps {
    onJoin: (roomId: string, playerName: string) => void;
}

const generateRoomCode = (): string => {
    // Generate 6-digit alphanumeric room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0,O,1,I
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const Lobby = ({ onJoin }: LobbyProps) => {
    const [roomCode, setRoomCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [error, setError] = useState('');

    const handleJoin = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }
        setError('');
        onJoin(roomCode.toUpperCase(), playerName.trim());
    };

    const handleCreate = () => {
        if (!playerName.trim()) {
            setError('Please enter your name first');
            return;
        }
        setError('');
        const newCode = generateRoomCode();
        onJoin(newCode, playerName.trim());
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 drop-shadow-lg tracking-tighter">
                        PRUNO
                    </h1>
                    <p className="text-white/60 mt-2">The Ultimate UNO Experience</p>
                </div>

                {/* Error Message */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-center"
                    >
                        {error}
                    </motion.div>
                )}

                <div className="space-y-4">
                    {/* Player Name Input */}
                    <div>
                        <label className="text-white/60 text-sm uppercase tracking-wider block mb-2">Your Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            maxLength={15}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 text-white text-xl font-bold text-center placeholder-white/30 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
                        />
                    </div>

                    {/* Room Code Input */}
                    <div>
                        <label className="text-white/60 text-sm uppercase tracking-wider block mb-2">Room Code</label>
                        <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                            maxLength={6}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 text-white text-2xl font-bold text-center placeholder-white/30 focus:outline-none focus:ring-4 focus:ring-pink-500/50 tracking-[0.5em]"
                        />
                    </div>

                    {/* Join Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleJoin}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold py-4 rounded-xl text-xl shadow-xl"
                    >
                        🎮 JOIN ROOM
                    </motion.button>

                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-white/20"></div>
                        <span className="flex-shrink mx-4 text-white/50">OR</span>
                        <div className="flex-grow border-t border-white/20"></div>
                    </div>

                    {/* Create Room Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreate}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl text-xl border-2 border-dashed border-white/30 hover:border-white/50"
                    >
                        ✨ CREATE NEW ROOM
                    </motion.button>
                </div>

                {/* Footer */}
                <p className="text-white/30 text-center text-sm mt-6">
                    Share the 6-digit code with your friends to play together!
                </p>
            </motion.div>
        </div>
    );
};
