// src/chat/schemas/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;
export type ConversationDocument = Conversation & Document;

@Schema()
class ReactionSchema {
  @Prop({ required: true })
  emoji: string;

  @Prop({ required: true, default: 1 })
  count: number;

  @Prop([String])
  users: string[];
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Prop({ required: false })
  userId: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ type: [ReactionSchema], default: [] })
  reactions: ReactionSchema[];
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, unique: true, type: Number })  
  threadId: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [{ type: Message }], default: [] })
  messages: Message[];

  @Prop()
  lastMessage: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;
}

const MessageSchema = SchemaFactory.createForClass(Message);
const ConversationSchema = SchemaFactory.createForClass(Conversation);


ConversationSchema.index({ userId: 1 });

export { MessageSchema, ConversationSchema };