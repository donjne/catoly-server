// src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Delete,
  Put,
  HttpException,
  HttpStatus,
  DefaultValuePipe,
  Query,
  ParseIntPipe,
  NotFoundException,
  Sse,
  Res,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrivyAuthGuard } from '../auth/privy.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Observable } from 'rxjs';
import { map, catchError, finalize } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

@Controller('chat')
// @UseGuards(PrivyAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('conversations')
  async createConversation() {
    try {
      const randomUserId = `user_${Math.floor(Math.random() * 1000000)}`;
      return await this.chatService.createConversation(randomUserId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations')
  async getConversations(
    @GetUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    try {
      return await this.chatService.getConversations(user.sub, page, limit);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get conversations',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('conversations/:threadId')
  async getConversation(
    @GetUser() user: any,
    @Param('threadId') threadId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    try {
      return await this.chatService.getConversation(
        user.sub,
        threadId,
        page,
        limit,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get conversation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('conversations/:threadId/messages')
  async sendMessage(
    @Param('threadId', ParseIntPipe) threadId: number, // Parse as number since threadId is numeric
    @Body() body: { content: string },
  ) {
    try {
      // Let service handle the full flow
      // return await this.chatService.handleMessageFlow(threadId, body.content);

      // await this.chatService.addMessage(
      //   threadId,
      //   body.content,
      //   'user'
      // );

      // Get AI response
      const aiResponse = await this.chatService.getAIResponse(
        threadId,
        body.content,
      );
      // console.log(aiResponse);

      // Add AI response
      // return await this.chatService.addMessage(
      //   threadId,
      //   aiResponse,
      //   'assistant'
      // );

      return {
        message: 'Successfully queried data',
        data: aiResponse,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        error.message || 'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('stream')
  async streamResponse(
    @Body('question') question: string,
    @Res() response: ExpressResponse,
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    this.chatService.getStreamingAIResponse(question).subscribe({
      next: (chunk) => {
        response.write(chunk);
      },
      error: (error) => {
        response.end();
      },
      complete: () => {
        response.end();
      },
    });
  }

  @Post('mock-stream')
  async mockStreamResponse(
    @Body('question') question: string,
    @Res() response: ExpressResponse,
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    this.chatService.getMockStreamingResponse(question).subscribe({
      next: (chunk) => {
        response.write(chunk);
      },
      error: (error) => {
        response.end();
      },
      complete: () => {
        response.end();
      },
    });
  }

  @Post('conversations/:threadId/switch')
  async switchThread(
    @GetUser() user: any,
    @Param('threadId') threadId: string,
  ) {
    try {
      return await this.chatService.switchThread(user.sub, threadId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to switch thread',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') messageId: string, @GetUser() user: any) {
    try {
      return await this.chatService.deleteMessage(messageId, user.sub);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete message',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('messages/:id/react')
  async reactToMessage(
    @Param('id') messageId: string,
    @Body() data: { emoji: string },
    @GetUser() user: any,
  ) {
    try {
      return await this.chatService.addReaction(
        messageId,
        data.emoji,
        user.sub,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add reaction',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('messages/:id')
  async editMessage(
    @Param('id') messageId: string,
    @Body() data: { content: string },
    @GetUser() user: any,
  ) {
    try {
      return await this.chatService.editMessage(
        messageId,
        data.content,
        user.sub,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to edit message',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
