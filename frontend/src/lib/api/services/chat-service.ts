import { apiClient } from "../axios-client";

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

// BCorDFWebApi's new ChatController — stateless general-Q&A assistant
// (Options/OpenAiOptions.ChatModel via IOpenAiChatService). The frontend
// owns the running conversation and resends it each turn.
export const chatService = {
  sendMessage: async (history: ChatHistoryTurn[], message: string): Promise<string> => {
    const { data } = await apiClient.post<{ reply: string }>("/Chat/message", { history, message });
    return data.reply;
  },
};
