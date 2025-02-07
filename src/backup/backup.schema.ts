
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type BackUpDocument = HydratedDocument<BackUp>;

@Schema({ timestamps: true })
export class BackUp {
  @Prop({ required: true, index: true })
  path: string;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  data: any;

  @Prop({ required: true })
  deletedAt: Date;

  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;

  @Prop({ default: false })
  restored: boolean;
}

export const BackUpSchema = SchemaFactory.createForClass(BackUp);