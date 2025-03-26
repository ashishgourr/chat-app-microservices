export interface MessageResponse {
  userId: string;
  content: string;
  timestamp: string;
  error?: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
}
