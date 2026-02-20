import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api';

// Derive SOCKET_URL reliably from API_URL (which might be /api on Vercel vs a full URL on localhost)
const SOCKET_URL = API_URL ? API_URL.replace(/\/api$/, '') : 'http://localhost:5000';

export function useSocket(eventHandlers = {}) {
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'] // Try websocket first, fallback to polling
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        // Register handlers
        Object.entries(eventHandlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });

        return () => {
            if (socket) {
                // Remove specific handlers
                Object.entries(eventHandlers).forEach(([event, handler]) => {
                    socket.off(event, handler);
                });
                socket.disconnect();
            }
        };
    }, []); // Empty dependency array means this runs once on mount

    return socketRef.current;
}
