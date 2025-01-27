// src/chat/schemas/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { models } from 'mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/user/schema/user.schema';
import { Message } from './message.schema';

export type ConversationDocument = Conversation & Document;

// @Schema()
// class ReactionSchema {
//   @Prop({ required: true })
//   emoji: string;

//   @Prop({ required: true, default: 1 })
//   count: number;

//   @Prop([String])
//   users: string[];
// }

@Schema({ timestamps: true })
export class Conversation {
  // @Prop({ required: true })
  // userId: string;
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: User;

  @Prop({ required: true, unique: true, type: Number })  
  threadId: number;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'Message',
    default: null 
  })
  lastMessage: Message;

  // @Prop({ default: true })
  // isActive: boolean;

  // @Prop({ type: [{ type: Message }], default: [] })
  // messages: Message[];
  // @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  // messages: Message[];

  // @Prop()
  // lastMessage: string;
}

@Schema()
export class AIThread {
  @Prop({ unique: true, default: 'default' })
  name: string

  @Prop({
    unique: true,
    index: true 
  })
  threadCount: number
}


const AIThreadSchema = SchemaFactory.createForClass(AIThread)

const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ user: 1 });



export { ConversationSchema, AIThreadSchema };