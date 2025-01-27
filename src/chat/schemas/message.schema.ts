
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
export type MessageDocument = Message & Document;
import { Document, Types } from 'mongoose';
import { Conversation } from './conversation.schema';

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    FILE = 'file'
  }


@Schema({ timestamps: true })
export class Message {
  // @Prop({ type: Types.ObjectId })
  // _id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['user', 'assistant'] })
  role: 'user' | 'assistant';

  @Prop({
    type: Types.ObjectId, 
    ref: 'User', 
    required: true  
  })
  userId: string;

  @Prop({
    type: Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  })
  conversation: string;

  @Prop({ 
    type: String, 
    enum: MessageType, 
    default: 'text' 
  })
  type: MessageType;

  // @Prop({ default: Date.now })
  // timestamp: Date;

  // @Prop({ type: Date })
  // editedAt?: Date;

  // @Prop({ type: [ReactionSchema], default: [] })
  // reactions: ReactionSchema[];
}

const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversation: 1 });

export { MessageSchema }