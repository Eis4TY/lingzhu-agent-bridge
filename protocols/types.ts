export interface LingzhuMessage {
    role: 'user' | 'agent' | 'system';
    type: 'answer' | 'question' | 'tool' | 'error';
    answer_stream?: string;
    answer?: string;
    message_id: string;
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
    }[];
}

export interface AutoGLMRequest {
    timestamp: number;
    conversation_id: string;
    msg_type: string; // e.g., 'client_test'
    msg_id: string;
    data: {
        biz_type: string; // e.g., 'test_agent'
        instruction: string;
    };
}

export interface AutoGLMResponse {
    // Define based on observation or assumption if not fully documented
    status?: string;
    result?: any;
    message?: string;
    // WebSocket messages might vary
}
