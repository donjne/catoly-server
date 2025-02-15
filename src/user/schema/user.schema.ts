import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Conversation } from 'src/chat/schemas/conversation.schema';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
    USER = 'user',
    // AI = 'ai',
    ADMIN = 'admin'
}

@Schema()
export class User {
    @Prop({ 
        unique: true,
        index: true,
        trim: true,
    })
    address: string;

    @Prop({ 
        unique: true,
        trim: true,
    })
    inAppAddress: string;

    @Prop()
    email: string;

    @Prop({ 
        type: Types.ObjectId, 
        ref: 'Conversation'
    })
    conversations: Conversation[];

    @Prop({ 
        type: String, 
        enum: UserRole, 
        default: UserRole.USER 
    })
    role: UserRole;

    @Prop({
        type: String,
        default: ''
    })
    status: string

    @Prop({
        type: Date
    })
    deletionStartedAt: Date

    @Prop({
        type: Boolean
    })
    mongoDeleted: boolean

    @Prop({
        type: Boolean
    })
    redisDeleted: boolean

    @Prop({
        type: Boolean
    })
    vaultDeleted: boolean
}


export const UserSchema = SchemaFactory.createForClass(User)

UserSchema.index({ address: 1 });