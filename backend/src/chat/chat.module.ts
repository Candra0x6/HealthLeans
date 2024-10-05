import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [PrismaService, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
