import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ChatService } from './chat.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const USER_ID = 'user-1';
const OTHER_USER_ID = 'user-2';
const THREAD_ID = 'thread-1';
const MESSAGE_ID = 'msg-1';

const mockThread = {
  id: THREAD_ID,
  userId: USER_ID,
  title: 'Test thread',
  language: 'UZ',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ChatService', () => {
  let service: ChatService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      chatThread: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ChatService);
  });

  // ── createThread ────────────────────────────────────────────────────

  it('createThread — creates and returns a new thread', async () => {
    prisma.chatThread.create.mockResolvedValue(mockThread);

    const result = await service.createThread(USER_ID, { title: 'Test thread', language: 'UZ' as any });

    expect(result).toEqual(mockThread);
    expect(prisma.chatThread.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, title: 'Test thread', language: 'UZ' },
    });
  });

  // ── getThreads ──────────────────────────────────────────────────────

  it('getThreads — returns user threads excluding deleted', async () => {
    prisma.chatThread.findMany.mockResolvedValue([mockThread]);

    const result = await service.getThreads(USER_ID);

    expect(result).toHaveLength(1);
    expect(prisma.chatThread.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
    });
  });

  // ── getThread ───────────────────────────────────────────────────────

  it('getThread — returns thread with messages', async () => {
    const threadWithMessages = { ...mockThread, messages: [{ id: MESSAGE_ID, content: 'hello' }] };
    prisma.chatThread.findFirst.mockResolvedValue(threadWithMessages);

    const result = await service.getThread(USER_ID, THREAD_ID);

    expect(result.messages).toHaveLength(1);
  });

  it('getThread — throws NotFoundException when thread does not exist', async () => {
    prisma.chatThread.findFirst.mockResolvedValue(null);

    await expect(service.getThread(USER_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  it('getThread — throws ForbiddenException when user does not own thread', async () => {
    prisma.chatThread.findFirst.mockResolvedValue({
      ...mockThread,
      userId: OTHER_USER_ID,
      messages: [],
    });

    await expect(service.getThread(USER_ID, THREAD_ID)).rejects.toThrow(ForbiddenException);
  });

  // ── deleteThread ────────────────────────────────────────────────────

  it('deleteThread — soft-deletes the thread', async () => {
    prisma.chatThread.findFirst.mockResolvedValue(mockThread);
    prisma.chatThread.update.mockResolvedValue({ ...mockThread, deletedAt: new Date() });

    await service.deleteThread(USER_ID, THREAD_ID);

    expect(prisma.chatThread.update).toHaveBeenCalledWith({
      where: { id: THREAD_ID },
      data: { deletedAt: expect.any(Date) },
    });
  });

  // ── saveUserMessage ─────────────────────────────────────────────────

  it('saveUserMessage — creates USER message in transaction', async () => {
    const message = { id: MESSAGE_ID, threadId: THREAD_ID, userId: USER_ID, role: 'USER', content: 'Hello' };
    prisma.$transaction.mockResolvedValue([message, {}]);

    const result = await service.saveUserMessage(THREAD_ID, USER_ID, 'Hello', 'UZ' as any);

    expect(result).toEqual(message);
  });

  // ── submitFeedback ──────────────────────────────────────────────────

  it('submitFeedback — updates message metadata with feedback', async () => {
    const message = { id: MESSAGE_ID, userId: USER_ID, metadata: null };
    prisma.chatMessage.findUnique.mockResolvedValue(message);
    prisma.chatMessage.update.mockResolvedValue({});

    await service.submitFeedback(USER_ID, MESSAGE_ID, 'up');

    expect(prisma.chatMessage.update).toHaveBeenCalledWith({
      where: { id: MESSAGE_ID },
      data: {
        metadata: expect.objectContaining({ feedback: 'up', feedbackAt: expect.any(String) }),
      },
    });
  });
});
