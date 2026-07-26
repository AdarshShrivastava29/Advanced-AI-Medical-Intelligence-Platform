import { apiClient } from '@/lib/apiClient';
import type {
  ChatMessageItem,
  ChatResponse,
  DocumentResponse,
  Page,
} from '@/types/api';

// Documents + chat (RAG) API calls (docs/13_RAG_Architecture.md, docs/18_API_Design.md).

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<{ document: DocumentResponse }>('/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.document;
}

export async function listDocuments(page = 1, size = 50): Promise<Page<DocumentResponse>> {
  const { data } = await apiClient.get<Page<DocumentResponse>>('/documents', {
    params: { page, size },
  });
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`);
}

export async function askAssistant(message: string, sessionId?: string): Promise<ChatResponse> {
  const { data } = await apiClient.post<ChatResponse>('/chat', {
    message,
    session_id: sessionId ?? null,
  });
  return data;
}

export async function getChatHistory(): Promise<ChatMessageItem[]> {
  const { data } = await apiClient.get<ChatMessageItem[]>('/chat/history');
  return data;
}

export async function clearChatHistory(): Promise<void> {
  await apiClient.delete('/chat/history');
}
