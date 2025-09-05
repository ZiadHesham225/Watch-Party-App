import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import signalRService from '../services/signalRService';
import { useAuth } from './AuthContext';
import { HubConnection } from '@microsoft/signalr';

interface SignalRContextType {
    connection: HubConnection | null;
    isConnected: boolean;
    isConnecting: boolean;
}

const SignalRContext = createContext<SignalRContextType | undefined>(undefined);

interface SignalRProviderProps {
    children: ReactNode;
}

export const SignalRProvider: React.FC<SignalRProviderProps> = ({ children }) => {
    const { token } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const handleConnectionStateChange = (connected: boolean, connecting: boolean) => {
            if (isMounted) {
                setIsConnected(connected);
                setIsConnecting(connecting);
            }
        };

        signalRService.onConnectionStateChange = handleConnectionStateChange;

        const connectWithTimeout = async () => {
            // Small delay to let any pending cleanup complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (isMounted) {
                try {
                    await signalRService.connect(token);
                } catch (error) {
                }
            }
        };

        connectWithTimeout();

        return () => {
            isMounted = false;
            // Don't disconnect here - let the cleanup effect handle it
        };
    }, [token]);

    // Separate effect for cleanup to avoid race conditions on token change.
    useEffect(() => {
        // This will run only once when the component mounts and the cleanup will run only when it unmounts.
        return () => {
            signalRService.disconnect();
            signalRService.onConnectionStateChange = () => {}; // Reset the handler on unmount
        };
    }, []); // Empty dependency array is crucial here.

    const value = {
        connection: signalRService.getConnection(),
        isConnected,
        isConnecting,
    };

    return (
        <SignalRContext.Provider value={value}>
            {children}
        </SignalRContext.Provider>
    );
};

export const useSignalR = (): SignalRContextType => {
    const context = useContext(SignalRContext);
    if (context === undefined) {
        throw new Error('useSignalR must be used within a SignalRProvider');
    }
    return context;
};
