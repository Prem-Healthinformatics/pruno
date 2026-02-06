
import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameAction, GameState } from '@pruno/shared';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessageData {
    senderId: string;
    senderName: string;
    encryptedMessage: string;
    timestamp: number;
}

const getGuestId = () => {
    let id = localStorage.getItem('guestId');
    if (!id) {
        id = uuidv4();
        localStorage.setItem('guestId', id);
    }
    return id;
};

export const useGameSocket = (roomId: string, playerName: string) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
    const socketRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const playerId = getGuestId();

    useEffect(() => {
        if (!roomId) return;

        // In dev, use localhost. In prod, use the same domain but upgrade to WSS
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = import.meta.env.DEV
            ? 'localhost:8787'
            : (import.meta.env.VITE_BACKEND_URL || window.location.host.replace('pruno.pages.dev', 'pruno-backend.workers.dev'));
        const wsUrl = `${protocol}//${backendHost}/api/room/${roomId}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to room', roomId);
            setIsConnected(true);
            // Auto-join with the custom player name
            ws.send(JSON.stringify({
                type: 'JOIN',
                payload: { id: playerId, name: playerName }
            }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'STATE_UPDATE') {
                    setGameState(data.payload);
                } else if (data.type === 'CHAT_MESSAGE') {
                    setChatMessages(prev => [...prev, data.payload]);
                }
            } catch (e) {
                console.error('Failed to parse message', e);
            }
        };

        ws.onclose = () => {
            setIsConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [roomId, playerId, playerName]);

    const sendAction = useCallback((action: GameAction | { type: 'CHAT'; payload: { playerId: string; encryptedMessage: string } }) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(action));
        }
    }, []);

    const sendChatMessage = useCallback((encryptedMessage: string) => {
        sendAction({
            type: 'CHAT',
            payload: { playerId, encryptedMessage }
        });
    }, [playerId, sendAction]);

    return { gameState, isConnected, sendAction, sendChatMessage, chatMessages, playerId };
};
