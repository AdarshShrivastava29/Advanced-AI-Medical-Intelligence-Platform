import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/lib/api/knowledge';

/** Paginated knowledge-base documents (polls while any are still processing). */
export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => api.listDocuments(1, 50),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? [];
      const pending = items.some((d) => d.status === 'processing' || d.status === 'uploaded');
      return pending ? 3000 : false;
    },
  });
}

/** Upload a PDF for ingestion. */
export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadDocument(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** Delete a document. */
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
}

/** Chat history query. */
export function useChatHistory() {
  return useQuery({ queryKey: ['chat', 'history'], queryFn: api.getChatHistory });
}

/** Ask the assistant. */
export function useAskAssistant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api.askAssistant(message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'history'] }),
  });
}

/** Clear chat history. */
export function useClearChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.clearChatHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat', 'history'] }),
  });
}
