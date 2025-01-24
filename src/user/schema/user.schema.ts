import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
    @Prop({ 
        unique: true,
        index: true,
        trim: true,
    })
    address: string;

    @Prop()
    email: string;
}

export const UserSchema = SchemaFactory.createForClass(User)