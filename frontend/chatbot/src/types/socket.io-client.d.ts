declare module 'socket.io-client' {
  export interface SocketOptions {
    path?: string;
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    randomizationFactor?: number;
    timeout?: number;
    transports?: string[];
    upgrade?: boolean;
    forceJSONP?: boolean;
    jsonp?: boolean;
    forceBase64?: boolean;
    enablesXDR?: boolean;
    timestampRequests?: boolean;
    timestampParam?: string;
    policyPort?: number;
    transportOptions?: any;
    rememberUpgrade?: boolean;
    onlyBinaryUpgrades?: boolean;
    requestTimeout?: number;
    protocols?: string[];
    extraHeaders?: { [key: string]: string };
    auth?: { [key: string]: string };
    addTrailingSlash?: boolean;
  }

  export interface ManagerOptions extends SocketOptions {
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    randomizationFactor?: number;
    autoConnect?: boolean;
    parser?: any;
  }

  export interface Socket {
    id: string;
    connected: boolean;
    disconnected: boolean;
    open(): Socket;
    connect(): Socket;
    send(...args: any[]): Socket;
    emit(event: string, ...args: any[]): Socket;
    on(event: string, fn: Function): Socket;
    once(event: string, fn: Function): Socket;
    off(event?: string, fn?: Function): Socket;
    removeListener(event: string, fn?: Function): Socket;
    removeAllListeners(event?: string): Socket;
    disconnect(): Socket;
    close(): Socket;
    join(room: string): void;
    leave(room: string): void;
    to(room: string): Socket;
    compress(compress: boolean): Socket;
    volatile: Socket;
  }

  export function io(uri?: string, opts?: Partial<ManagerOptions>): Socket;
  export function io(opts?: Partial<ManagerOptions>): Socket;
  export function connect(uri?: string, opts?: Partial<ManagerOptions>): Socket;
  export function connect(opts?: Partial<ManagerOptions>): Socket;
} 