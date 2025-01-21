// src/chat/chat.service.ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { 
  Conversation, 
  ConversationDocument,
  Message,
  MessageDocument 
} from './schemas/conversation.schema';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
    private readonly httpService: HttpService
  ) {}

  async createConversation(userId: string): Promise<ConversationDocument> {
    try {
      const threadId = await this.createAIThread();
      
      const conversation = new this.conversationModel({
        userId,
        threadId,
        messages: [],
        isActive: true,
        lastMessage: "",
        lastMessageAt: new Date()
      });

      return conversation.save();
    } catch (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  async getConversations(userId: string, page = 1, limit = 20) {
    try {
      return this.conversationModel
        .find({ userId })
        .sort({ lastMessageAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
    } catch (error) {
      throw new Error(`Failed to get conversations: ${error.message}`);
    }
  }

  async getConversation(userId: string, threadId: string, page = 1, limit = 20) {
    const conversation = await this.conversationModel
      .findOne({ userId, threadId })
      .exec();
  
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
  
    // Calculate skip for pagination
    const skip = (page - 1) * limit;
    
    // Get paginated messages
    const messages = conversation.messages
      .slice(skip, skip + limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
    return {
      ...conversation.toObject(),
      messages,
      hasMore: skip + limit < conversation.messages.length,
      total: conversation.messages.length
    };
  }

  async addMessage(
    threadId: number, 
    content: string, 
    role: 'user' | 'assistant',
    userId?: string 
  ) {
    const message = {
      content,
      role,
      userId, 
      timestamp: new Date(),
      reactions: []
    };
  
    const updatedConversation = await this.conversationModel.findOneAndUpdate(
      { threadId },
      {
        $push: { messages: message },
        $set: { 
          lastMessage: content,
          lastMessageAt: new Date()
        }
      },
      { new: true }
    );
  
    if (!updatedConversation) {
      throw new NotFoundException('Conversation not found');
    }
  
    return updatedConversation;
  }

  private lastThreadId = 0;
  private async createAIThread(): Promise<number> {
    try {
      const response = await axios.post('http://52.26.233.41/agent', {
        question: "Start a new conversation",
        thread_id: 0
      });
  
      this.lastThreadId += 1;
    
      console.log('Generated threadId:', this.lastThreadId);
      return this.lastThreadId;
    } catch (error) {
      throw new Error(`Failed to create AI thread: ${error.message}`);
    }
  }
  
 
  // async getAIResponse(threadId: number, question: string) {
  //   try {
  //     const response = await axios.post('http://52.26.233.41/agent', {
  //       question,
  //       thread_id: threadId
  //     });
  
  //     return response.data.result[1].TransactionExplorer.messages[0].content;
  //   } catch (error) {
  //     throw new Error(`Failed to get AI response: ${error.message}`);
  //   }
  // }

  // private async createAIThread(): Promise<string> {
  //   try {
  //     const response = await fetch('http://52.26.233.41/agent', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({
  //         question: "Start a new conversation",
  //         thread_id: 0
  //       })
  //     });

  //     if (!response.ok) {
  //       throw new Error('AI service response was not ok');
  //     }

  //     const data = await response.json();
  //     return data.threadId;
  //   } catch (error) {
  //     throw new Error(`Failed to create AI thread: ${error.message}`);
  //   }
  // }

  async switchThread(userId: string, threadId: string) {
    await this.conversationModel.updateMany(
      { userId },
      { isActive: false }
    );

    const conversation = await this.conversationModel.findOneAndUpdate(
      { userId, threadId },
      { isActive: true },
      { new: true }
    );

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getAIResponse(threadId: number, question: string) {
    try {
      // return this.httpService.post('http://52.26.233.41/agent', {
      // // const response = this.httpService.post('http://52.26.233.41/agent', {
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     question,
      //     thread_id: threadId
      //   })
      // })
      // .pipe(
      //   map((response: AxiosResponse) => response.data),
      //   catchError((error) => {
      //     throw new Error(`Failed to fetch data: ${error.message}`);
      //   })
      // )

      const response = await firstValueFrom(
        this.httpService.post('http://52.26.233.41/agent', {
          // const response = this.httpService.post('http://52.26.233.41/agent', {
            question,
            thread_id: threadId || 3
            // body: JSON.stringify({
            //   // thread_id: threadId
            // })
          },
        {
          headers: {
            'Content-Type': 'application/json'
          },
        })
          .pipe(
          map((response: AxiosResponse) => response.data)
        )
      );
      return response;

      // if (!response.ok) {
      //   throw new Error('AI service response was not ok');
      // }

      // const data = await response.json();
      // return data.result[1].TransactionExplorer.messages[0].content;
    } catch (error) {
      console.log(error);
      
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.messageModel.findById(messageId);
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== userId) {
      throw new UnauthorizedException('Not authorized to delete this message');
    }

    await message.deleteOne();

    // Update conversation's lastMessage if needed
    const conversation = await this.conversationModel.findOne({
      'messages._id': messageId
    });

    if (conversation) {
      const messages = conversation.messages.filter(m => m._id.toString() !== messageId);
      const lastMessage = messages[messages.length - 1];
      
      await this.conversationModel.updateOne(
        { _id: conversation._id },
        { 
          messages,
          lastMessage: lastMessage?.content || '',
          lastMessageAt: lastMessage?.timestamp || new Date()
        }
      );
    }

    return { success: true };
  }

  async addReaction(messageId: string, emoji: string, userId: string) {
    const message = await this.messageModel.findById(messageId);
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
    
    if (reactionIndex > -1) {
      const reaction = message.reactions[reactionIndex];
      const userIndex = reaction.users.indexOf(userId);
      
      if (userIndex > -1) {  
        reaction.users.splice(userIndex, 1);
        reaction.count--;
        if (reaction.count === 0) {
          message.reactions.splice(reactionIndex, 1);
        }
      } else {
        reaction.users.push(userId);
        reaction.count++;
      }
    } else {
      message.reactions.push({
        emoji,
        count: 1,
        users: [userId]
      });
    }

    await message.save();
    return message;
  }

  async handleMessageFlow(threadId: number, content: string) {
    // 1. Get conversation to verify it exists and get userId
    const conversation = await this.conversationModel.findOne({ threadId });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
  
    // 2. Save user message
    await this.addMessage(
      threadId,
      content,
      'user',
      conversation.userId
    );
  
    try {
      // 3. Get AI response
      const aiResponse = await this.getAIResponse(threadId, content);
  
      // 4. Save AI response
      return await this.addMessage(
        threadId,
        aiResponse,
        'assistant',
        conversation.userId
      );
    } catch (error) {
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  async editMessage(messageId: string, content: string, userId: string) {
    const message = await this.messageModel.findById(messageId);
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.userId !== userId) {
      throw new UnauthorizedException('Not authorized to edit this message');
    }

    if (message.role !== 'user') {
      throw new UnauthorizedException('Cannot edit AI responses');
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    return message;
  }
}