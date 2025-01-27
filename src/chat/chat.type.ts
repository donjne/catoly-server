interface MessageMetadata {
  finish_reason?: string;
  model_name?: string;
  system_fingerprint?: string;
}

interface Message {
  type: 'human' | 'ai';
  content: string;
  additional_kwargs: Record<string, any>;
  response_metadata: MessageMetadata;
  name: string | null;
  id: string;
  example: boolean;
  tool_calls?: any[];
  invalid_tool_calls?: any[];
  usage_metadata?: any;
}

interface ChainOutput {
  messages: Message[];
}

interface AIMessageChunk {
  type: string;
  content: string;
  additional_kwargs: Record<string, any>;
  response_metadata: Record<string, any>;
  name: null | string;
  id: string;
  example: boolean;
  tool_calls: any[];
  invalid_tool_calls: any[];
  usage_metadata: null | any;
  tool_call_chunks: any[];
}

interface EventData {
  output?: ChainOutput;
  chunk?: AIMessageChunk;
}

export interface ChatEvent {
  event: 'on_chat_model_stream' | 'on_chain_end' | string;
  data: {
    chunk: AIMessageChunk;
  };
  run_id: string;
  name: string;
  tags: string[];
  metadata: {
    thread_id: number;
    user_id?: string;
    langgraph_step?: number;
    langgraph_node?: string;
    langgraph_triggers?: string[];
    langgraph_path?: [string, string];
    langgraph_checkpoint_ns?: string;
    checkpoint_ns?: string;
    ls_provider?: string;
    ls_model_name?: string;
    ls_model_type?: string;
    ls_temperature?: number;
    [key: string]: any;
  };
  parent_ids: string[];
}

// export interface ChatEvent {
//   data: BaseEvent;
// }
