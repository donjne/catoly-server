import { ObjectId } from "mongoose"

export class User {
    address: string
    email?: string
}

export class CreateUserPayload extends User {}

export class userJwtData {
    id: ObjectId
    address: string
    email: string
}

export class responseObect {
    message: string
    data?: object
}

export class AuthTokens {
    accessToken: string
    refreshToken: string
}