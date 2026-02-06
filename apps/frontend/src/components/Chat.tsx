
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { encryptMessage, decryptMessage } from '../utils/crypto';

interface ChatMessage {
    senderId: string;
    senderName: string;
    message: string;
    timestamp: number;
    isMe: boolean;
}

interface ChatProps {
    roomId: string;
    playerId: string;
    onSendMessage: (encryptedMessage: string) => void;
    incomingMessages: Array<{
        senderId: string;
        senderName: string;
        encryptedMessage: string;
        timestamp: number;
    }>;
}

export const Chat = ({ roomId, playerId, onSendMessage, incomingMessages }: ChatProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Decrypt incoming messages
    useEffect(() => {
        const processMessages = async () => {
            const processed: ChatMessage[] = [];
            for (const msg of incomingMessages) {
                const decrypted = await decryptMessage(msg.encryptedMessage, roomId);
                processed.push({
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    message: decrypted,
                    timestamp: msg.timestamp,
                    isMe: msg.senderId === playerId
                });
            }
            setMessages(processed);

            // Update unread count if chat is closed
            if (!isOpen && processed.length > messages.length) {
                setUnreadCount(prev => prev + (processed.length - messages.length));
            }
        };
        processMessages();
    }, [incomingMessages, roomId, playerId, isOpen, messages.length]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Clear unread when opening chat
    useEffect(() => {
        if (isOpen) setUnreadCount(0);
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const encrypted = await encryptMessage(input.trim(), roomId);
        onSendMessage(encrypted);
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Chat Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 z-40 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl"
            >
                💬
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.8 }}
                        className="fixed bottom-20 right-4 z-40 w-80 h-96 bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
                            <span className="font-bold text-white">🔒 Encrypted Chat</span>
                            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white text-xl">×</button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {messages.length === 0 ? (
                                <div className="text-center text-white/40 text-sm py-8">
                                    No messages yet.<br />Start chatting! 🎮
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: msg.isMe ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        <span className="text-xs text-white/40 mb-1">
                                            {msg.isMe ? 'You' : msg.senderName}
                                        </span>
                                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.isMe
                                                ? 'bg-purple-600 text-white rounded-br-none'
                                                : 'bg-white/10 text-white rounded-bl-none'
                                            }`}>
                                            {msg.message}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/10 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Type a message..."
                                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSend}
                                className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center"
                            >
                                ➤
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
