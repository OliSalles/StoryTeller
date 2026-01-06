import { ENV } from "./env";
import * as db from "../db";
import * as subscriptionDb from "../subscriptions";
import OpenAI from "openai";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  // Campos para rastreamento de uso de tokens
  userId?: number;
  featureId?: number;
  operation?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = async (provider?: string) => {
  // URLs oficiais de cada provider - integração direta
  const providerUrls: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    anthropic: "https://api.anthropic.com/v1/messages",
    google: "https://generativelanguage.googleapis.com/v1beta/models",
    azure: "", // Precisa ser configurado
    ollama: "http://localhost:11434/api/chat",
  };

  return providerUrls[provider || "openai"] || providerUrls.openai;
};

const assertApiKey = async (apiKey?: string) => {
  const key = apiKey || ENV.forgeApiKey;
  if (!key) {
    throw new Error("API Key não configurada. Configure a LLM em Config. LLM");
  }
  return key;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  // Buscar configuração global da LLM do banco
  const llmConfig = await db.getGlobalLlmConfig();
  
  if (!llmConfig) {
    throw new Error("Configuração da LLM não encontrada. Configure em Config. LLM");
  }

  const apiKey = await assertApiKey(llmConfig.apiKey || undefined);
  
  console.log('[LLM] Using provider:', llmConfig.provider);
  console.log('[LLM] Using model:', llmConfig.model);
  console.log('[LLM] API Key starts with:', apiKey.substring(0, 10) + '...');

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    userId,
    featureId,
    operation,
  } = params;

  // Se for OpenAI, usar o SDK oficial
  if (llmConfig.provider === "openai") {
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    console.log('[LLM] Using OpenAI SDK');

    const chatParams: any = {
      model: llmConfig.model,
      messages: messages.map(normalizeMessage),
    };

    if (tools && tools.length > 0) {
      chatParams.tools = tools;
    }

    const normalizedToolChoice = normalizeToolChoice(
      toolChoice || tool_choice,
      tools
    );
    if (normalizedToolChoice) {
      chatParams.tool_choice = normalizedToolChoice;
    }

    if (llmConfig.maxTokens) {
      chatParams.max_tokens = llmConfig.maxTokens;
    }

    if (llmConfig.temperature) {
      chatParams.temperature = parseFloat(llmConfig.temperature);
    }

    const normalizedResponseFormat = normalizeResponseFormat({
      responseFormat,
      response_format,
      outputSchema,
      output_schema,
    });

    if (normalizedResponseFormat) {
      chatParams.response_format = normalizedResponseFormat;
    }

    console.log('[LLM] Calling OpenAI API...');
    const response = await openai.chat.completions.create(chatParams);
    console.log('[LLM] OpenAI response received');
    
    // Salvar uso de tokens se userId for fornecido
    if (userId && response.usage) {
      try {
        // Salvar no histórico detalhado
        await db.createTokenUsage({
          userId,
          featureId: featureId || null,
          operation: operation || 'unknown',
          model: llmConfig.model,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        });
        
        // Incrementar contador da assinatura (para planos pagos)
        await subscriptionDb.incrementTokenUsage(userId, response.usage.total_tokens);
      } catch (error) {
        console.error('[LLM] Failed to save token usage:', error);
        // Não falhar a requisição se o salvamento falhar
      }
    }
    
    return response as InvokeResult;
  }

  // Para outros providers (Anthropic, Google), usar fetch
  const apiUrl = await resolveApiUrl(llmConfig.provider);
  console.log('[LLM] API URL:', apiUrl);

  const payload: Record<string, unknown> = {
    model: llmConfig.model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  if (llmConfig.maxTokens) {
    payload.max_tokens = llmConfig.maxTokens;
  }

  if (llmConfig.temperature) {
    payload.temperature = parseFloat(llmConfig.temperature);
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  // Configurar headers baseado no provider
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  if (llmConfig.provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (llmConfig.provider === "google") {
    headers["x-goog-api-key"] = apiKey;
  } else {
    headers["authorization"] = `Bearer ${apiKey}`;
  }

  // Ajustar payload para Anthropic (formato diferente)
  let finalPayload = payload;
  if (llmConfig.provider === "anthropic") {
    finalPayload = {
      model: llmConfig.model,
      max_tokens: llmConfig.maxTokens || 2000,
      messages: messages.map(normalizeMessage),
    };
    if (llmConfig.temperature) {
      finalPayload.temperature = parseFloat(llmConfig.temperature);
    }
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(finalPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[LLM] API Error Response:', errorText.substring(0, 500));
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText.substring(0, 200)}`
    );
  }

  const responseText = await response.text();
  console.log('[LLM] Response received, length:', responseText.length);
  console.log('[LLM] Response preview:', responseText.substring(0, 200));
  
  try {
    return JSON.parse(responseText) as InvokeResult;
  } catch (error) {
    console.error('[LLM] Failed to parse JSON response');
    console.error('[LLM] Response was:', responseText.substring(0, 1000));
    throw new Error(`Failed to parse LLM response as JSON: ${responseText.substring(0, 100)}`);
  }
}
