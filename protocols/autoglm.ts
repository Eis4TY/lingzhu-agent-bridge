import WebSocket from 'ws';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { AutoGLMRequest } from '@/protocols/types';

export class AutoGLMClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private url: string;
    private token: string;
    private _isConnected = false;

    constructor(url: string, token: string) {
        super();
        this.url = url;
        this.token = token;
    }

    private generateJwt(apiKey: string): string {
        try {
            const parts = apiKey.split('.');
            if (parts.length !== 2) return apiKey; // Assume already JWT if not id.secret

            const [id, secret] = parts;
            const header = { alg: "HS256", sign_type: "SIGN" };
            const timestamp = Date.now();
            const payload = {
                api_key: id,
                exp: timestamp + 3600 * 1000,
                timestamp: timestamp
            };

            const base64Url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

            const encodedHeader = base64Url(header);
            const encodedPayload = base64Url(payload);
            const signature = crypto.createHmac('sha256', Buffer.from(secret, 'utf8'))
                .update(`${encodedHeader}.${encodedPayload}`)
                .digest('base64url');

            return `${encodedHeader}.${encodedPayload}.${signature}`;
        } catch (e) {
            console.error("Failed to generate JWT", e);
            return apiKey;
        }
    }

    public get isConnected(): boolean {
        return this._isConnected;
    }

    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        const jwt = this.generateJwt(this.token);

        this.ws = new WebSocket(this.url, {
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
        });

        this.ws.on('open', () => {
            this._isConnected = true;
            this.emit('open');
            console.log('AutoGLM WebSocket connected');
        });

        this.ws.on('message', (data: WebSocket.RawData) => {
            const message = data.toString();
            try {
                const parsed = JSON.parse(message);
                this.emit('message', parsed);
            } catch (e) {
                console.error('Failed to parse AutoGLM message:', message);
            }
        });

        this.ws.on('error', (error) => {
            console.error('AutoGLM WebSocket error:', error);
            this.emit('error', error);
        });

        this.ws.on('close', () => {
            this._isConnected = false;
            this.emit('close');
            console.log('AutoGLM WebSocket closed');
        });
    }

    sendInstruction(instruction: string, conversationId: string) {
        if (!this._isConnected || !this.ws) {
            throw new Error('WebSocket not connected');
        }

        const payload: AutoGLMRequest = {
            timestamp: Date.now(),
            conversation_id: conversationId,
            msg_type: 'client_test',
            msg_id: crypto.randomUUID(),
            data: {
                biz_type: 'test_agent',
                instruction: instruction
            }
        };

        this.ws.send(JSON.stringify(payload));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
