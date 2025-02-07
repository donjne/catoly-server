export type APIResponse<T = any> = {
    message: string
    status: boolean
    data?: T
}