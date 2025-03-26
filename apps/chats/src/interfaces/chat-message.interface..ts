export interface ChatMessage {
  userId: string;
  content: string;
  groupId?: string;
  timestamp?: string;
}
