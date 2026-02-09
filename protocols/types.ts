export interface LingzhuMessage {
    role: 'user' | 'agent' | 'system';
    type: 'answer' | 'question' | 'tool' | 'error';
    answer_stream?: string;
    answer?: string;
    message_id: string;
    agent_id: string;
    is_finish: boolean;
    metadata?: Record<string, any>;
}

export interface LingzhuRequest {
    message_id: string;
    agent_id: string;
    message: {
        role: string;
        type: string;
        text: string;
        image_url?: string;
    }[];
}



export interface RequestLog {
    id: string; // UUID
    timestamp: number;
    agentId: string;
    agentName?: string; // Snapshot name at time of request
    request_summary: string; // Truncated input text
    status: 'success' | 'error' | 'pending';
    duration_ms?: number;
    error_message?: string;
    full_request?: any; // Optional, might want to limit size
    full_response?: any; // Optional
}

export interface SystemLog {
    timestamp: number;
    level: 'info' | 'error' | 'warn';
    message: string;
}
