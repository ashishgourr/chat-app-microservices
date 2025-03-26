import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Define the type for the Message document using Mongoose
export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  // UserId of the sender, required
  @Prop({ required: true })
  userId: string;

  // Optional groupId for group chat messages, null for one-to-one messages
  @Prop()
  groupId?: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 'SENT' })
  status: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
