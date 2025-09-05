import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import { ChatMessage, PlaybackState } from "../types/index";

class SignalRService {
    private connection: HubConnection | null = null;
    private isConnecting: boolean = false;

    private cleanupEventListeners = () => {
        if (!this.connection) return;
        
        this.connection.off("ReceiveMessage");
        this.connection.off("ReceiveChatHistory");
        this.connection.off("RoomJoined");
        this.connection.off("UserJoined");
        this.connection.off("UserLeft");
        this.connection.off("ReceivePlaybackUpdate");
        this.connection.off("Error");
        this.connection.off("ForceSyncPlayback");
        this.connection.off("ReceiveRoomParticipants");
        this.connection.off("ControlTransferred");
        this.connection.off("RoomClosed");
        this.connection.off("VideoChanged");
        this.connection.off("UserKicked");
    }

    private connectPromise: Promise<void> | null = null;
    public onConnectionStateChange: (isConnected: boolean, isConnecting: boolean) => void = () => { };

    public getConnection(): HubConnection | null {
        return this.connection;
    }

    public onReceiveMessage: (message: ChatMessage) => void = () => { };
    public onReceiveChatHistory: (messages: ChatMessage[]) => void = () => { };
    public onUserJoined: (displayName: string) => void = () => { };
    public onUserLeft: (displayName: string) => void = () => { };
    public onReceivePlaybackState: (state: PlaybackState) => void = () => { };
    public onError: (message: string) => void = () => { };
    public onReceiveRoomParticipants: (participants: any[]) => void = () => { };
    public onControlTransferred: (newControllerId: string, newControllerName: string) => void = () => { };
    public onRoomClosed: (roomId: string, reason: string) => void = () => { };
    public onVideoChanged: (videoUrl: string, videoTitle: string, videoThumbnail?: string) => void = () => { };
    public onRoomJoined: (roomId: string, participantId: string, displayName: string, avatarUrl: string) => void = () => { };
    public onUserKicked: (roomId: string, reason: string) => void = () => { };

    public connect = async (token: string | null) => {
        if (this.connection?.state === HubConnectionState.Connected) {
            return;
        }
        
        if (this.connectPromise) {
            return this.connectPromise;
        }

        this.connectPromise = this._doConnect(token);
        try {
            await this.connectPromise;
        } finally {
            this.connectPromise = null;
        }
    }

    private _doConnect = async (token: string | null) => {
        this.onConnectionStateChange(false, true);

        const hubUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5099'}/hubs/roomhub`;

        const connectionBuilder = new HubConnectionBuilder()
            .withUrl(hubUrl, {
                accessTokenFactory: () => token || ""
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Information);

        this.connection = connectionBuilder.build();
        this.registerClientEvents();

        this.connection.onclose(error => {
            this.onConnectionStateChange(false, false);
        });

        try {
            await this.connection.start();
            this.onConnectionStateChange(true, false);
        } catch (error) {
            this.onConnectionStateChange(false, false);
            throw error;
        }
    }

    public disconnect = async () => {
        this.connectPromise = null; // Cancel any pending connection attempts
        if (this.connection) {
            try {
                // Clean up event listeners
                this.removeEventListeners();
                await this.connection.stop();
            } catch (error) {
            } finally {
                this.connection = null;
            }
        }
    }

    private removeEventListeners = () => {
        if (!this.connection) return;
        
        this.connection.off("ReceiveMessage");
        this.connection.off("ReceiveChatHistory");
        this.connection.off("RoomJoined");
        this.connection.off("UserJoined");
        this.connection.off("UserLeft");
        this.connection.off("ReceivePlaybackUpdate");
        this.connection.off("Error");
        this.connection.off("ForceSyncPlayback");
        this.connection.off("ReceiveRoomParticipants");
        this.connection.off("ControlTransferred");
        this.connection.off("RoomClosed");
        this.connection.off("VideoChanged");
    }

    private registerClientEvents = () => {
        if (!this.connection) return;

        // Remove any existing event listeners to prevent duplicates
        this.connection.off("ReceiveMessage");
        this.connection.off("ReceiveChatHistory");
        this.connection.off("RoomJoined");
        this.connection.off("UserJoined");
        this.connection.off("UserLeft");
        this.connection.off("ReceivePlaybackUpdate");
        this.connection.off("Error");
        this.connection.off("ForceSyncPlayback");
        this.connection.off("ReceiveRoomParticipants");
        this.connection.off("ControlTransferred");
        this.connection.off("RoomClosed");
        this.connection.off("VideoChanged");

        this.connection.on("ReceiveMessage", (senderId: string, senderName: string, avatarUrl: string, message: string, timestamp: string) => {
            const chatMessage: ChatMessage = {
                id: `msg-${senderId}-${new Date(timestamp).getTime()}`, // More unique ID generation
                senderId,
                roomId: "", // We don't have roomId in the callback, but it's not used in the UI
                content: message,
                timestamp: new Date(timestamp).getTime(),
                senderName,
                avatarUrl,
                sentAt: timestamp
            };
            this.onReceiveMessage(chatMessage);
        });

        this.connection.on("ReceiveChatHistory", (messageDtos: any[]) => {
            const chatMessages: ChatMessage[] = messageDtos.map(dto => ({
                id: dto.Id,
                senderId: dto.SenderId,
                roomId: "", // Not provided, but not needed for display
                content: dto.Content,
                timestamp: new Date(dto.SentAt).getTime(),
                senderName: dto.SenderName,
                avatarUrl: dto.AvatarUrl,
                sentAt: dto.SentAt
            }));
            this.onReceiveChatHistory(chatMessages);
        });

        this.connection.on("RoomJoined", (roomId: string, participantId: string, displayName: string, avatarUrl: string) => {
            this.onRoomJoined(roomId, participantId, displayName, avatarUrl);
        });

        this.connection.on("UserJoined", (displayName: string) => {
            this.onUserJoined(displayName);
        });

        this.connection.on("UserLeft", (displayName: string) => {
            this.onUserLeft(displayName);
        });

        this.connection.on("ReceivePlaybackUpdate", (position: number, isPlaying: boolean) => {
            const state: PlaybackState = {
                progress: position,
                isPlaying,
                speed: 1.0, // Default speed
                duration: 0 // We don't have duration from this event
            };
            this.onReceivePlaybackState(state);
        });

        this.connection.on("Error", (message: string) => {
            this.onError(message);
        });

        this.connection.on("ParticipantJoinedNotification", (displayName: string) => {
            this.onUserJoined(displayName);
        });

        this.connection.on("ParticipantLeftNotification", (displayName: string) => {
            this.onUserLeft(displayName);
        });

        this.connection.on("ForceSyncPlayback", (position: number, isPlaying: boolean) => {
            const state: PlaybackState = {
                progress: position,
                isPlaying,
                speed: 1.0,
                duration: 0 // Duration will be preserved by the RoomPage handler
            };
            this.onReceivePlaybackState(state);
        });

        this.connection.on("ReceiveRoomParticipants", (participants: any[]) => {
            console.log('SignalR ReceiveRoomParticipants event received:', participants);
            this.onReceiveRoomParticipants(participants);
        });

        this.connection.on("ControlTransferred", (newControllerId: string, newControllerName: string) => {
            this.onControlTransferred(newControllerId, newControllerName);
        });

        this.connection.on("RoomClosed", (roomId: string, reason: string) => {
            this.onRoomClosed(roomId, reason);
        });

        this.connection.on("VideoChanged", (videoUrl: string, videoTitle: string, videoThumbnail?: string) => {
            this.onVideoChanged(videoUrl, videoTitle, videoThumbnail);
        });

        this.connection.on("UserKicked", (roomId: string, reason: string) => {
            this.onUserKicked(roomId, reason);
        });
    }

    public getIsConnected = (): boolean => {
        return this.connection?.state === HubConnectionState.Connected;
    }

    // Invocation methods
    public async joinRoom(roomId: string, password?: string) {
        if (!this.connection) {
            throw new Error('SignalR connection is not established');
        }
        
        if (this.connection.state !== HubConnectionState.Connected) {
            throw new Error(`SignalR connection is not in Connected state. Current state: ${this.connection.state}`);
        }
        
        try {
            // Create a promise that rejects if we receive an error during join
            const joinPromise = new Promise<void>((resolve, reject) => {
                // Set up error handler for this specific join attempt
                const errorHandler = (message: string) => {
                    // Clean up the handler
                    this.connection?.off("Error", errorHandler);
                    reject(new Error(message));
                };
                
                // Set up success handler for room joined
                const successHandler = () => {
                    // Clean up handlers
                    this.connection?.off("Error", errorHandler);
                    this.connection?.off("RoomJoined", successHandler);
                    resolve();
                };
                
                // Listen for error and success events
                this.connection?.on("Error", errorHandler);
                this.connection?.on("RoomJoined", successHandler);
                
                // Make the join call
                this.connection?.invoke("JoinRoom", roomId, password);
            });
            
            // Wait for either success or error with a timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Join room timeout')), 10000); // 10 second timeout
            });
            
            await Promise.race([joinPromise, timeoutPromise]);
        } catch (error) {
            throw error;
        }
    }

    public async leaveRoom(roomId: string) {
        await this.connection?.invoke("LeaveRoom", roomId);
    }

    public async sendMessage(roomId: string, message: string) {
        await this.connection?.invoke("SendMessage", roomId, message);
    }

    public async playVideo(roomId: string) {
        await this.connection?.invoke("PlayVideo", roomId);
    }

    public async pauseVideo(roomId: string) {
        await this.connection?.invoke("PauseVideo", roomId);
    }

    public async seekVideo(roomId: string, time: number) {
        await this.connection?.invoke("SeekVideo", roomId, time);
    }

    public async transferControl(roomId: string, newControllerId: string) {
        await this.connection?.invoke("TransferControl", roomId, newControllerId);
    }

    public async kickUser(roomId: string, userIdToKick: string) {
        await this.connection?.invoke("KickUser", roomId, userIdToKick);
    }
}

const signalRService = new SignalRService();
export default signalRService;
