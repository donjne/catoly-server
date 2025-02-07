export interface backUp {
    path: string
    data: any
    deletedAt: Date
    expiresAt: Date
    restored?: boolean
}