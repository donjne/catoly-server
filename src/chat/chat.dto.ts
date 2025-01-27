export interface AddMessageProps {
    content: string,
    role: userRole,
    conversation: string, 
    userId: string,
}

export type userRole = 'user' | 'assistant'