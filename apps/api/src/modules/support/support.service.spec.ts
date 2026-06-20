import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { SupportService } from './support.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const USER_ID = 'user-1';
const ADMIN_ID = 'admin-1';
const TICKET_ID = 'ticket-1';

const mockTicket = {
  id: TICKET_ID,
  userId: USER_ID,
  subject: 'Help needed',
  category: 'technical',
  status: 'OPEN',
  priority: 'NORMAL',
  assignedAdminId: null,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SupportService', () => {
  let service: SupportService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      supportMessage: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SupportService);
  });

  // ── createTicket ────────────────────────────────────────────────────

  it('createTicket — creates ticket with initial message', async () => {
    prisma.supportTicket.create.mockResolvedValue(mockTicket);

    const result = await service.createTicket(USER_ID, {
      subject: 'Help needed',
      category: 'technical',
      initialMessage: 'I need help with something',
    });

    expect(result).toEqual(mockTicket);
    expect(prisma.supportTicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        subject: 'Help needed',
        status: 'OPEN',
        priority: 'NORMAL',
        messages: {
          create: {
            senderUserId: USER_ID,
            content: 'I need help with something',
          },
        },
      }),
    });
  });

  // ── getUserTickets ──────────────────────────────────────────────────

  it('getUserTickets — returns user tickets ordered by updatedAt desc', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([mockTicket]);

    const result = await service.getUserTickets(USER_ID);

    expect(result).toEqual([mockTicket]);
    expect(prisma.supportTicket.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { updatedAt: 'desc' },
    });
  });

  // ── getTicketAsAdmin ────────────────────────────────────────────────

  it('getTicketAsAdmin — returns ticket with messages and user', async () => {
    const ticketWithDetails = {
      ...mockTicket,
      messages: [{ id: 'msg-1', content: 'hello' }],
      user: { id: USER_ID, profile: { firstName: 'Ali' } },
    };
    prisma.supportTicket.findUnique.mockResolvedValue(ticketWithDetails);

    const result = await service.getTicketAsAdmin(TICKET_ID);

    expect(result.messages).toHaveLength(1);
    expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { include: { profile: true } },
      },
    });
  });

  it('getTicketAsAdmin — throws NotFoundException when ticket not found', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(null);

    await expect(service.getTicketAsAdmin('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ── sendMessage ─────────────────────────────────────────────────────

  it('sendMessage — creates message on open ticket', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue(mockTicket);
    const message = { id: 'msg-2', ticketId: TICKET_ID, senderUserId: USER_ID, content: 'Follow up' };
    prisma.supportMessage.create.mockResolvedValue(message);
    prisma.supportTicket.update.mockResolvedValue(mockTicket);

    const result = await service.sendMessage(USER_ID, TICKET_ID, 'Follow up');

    expect(result).toEqual(message);
  });

  it('sendMessage — throws ForbiddenException on closed ticket', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue({ ...mockTicket, status: 'CLOSED' });

    await expect(service.sendMessage(USER_ID, TICKET_ID, 'Follow up')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ── adminReply ──────────────────────────────────────────────────────

  it('adminReply — creates admin message and sets WAITING_USER status', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue(mockTicket);
    const reply = { id: 'msg-3', ticketId: TICKET_ID, senderAdminId: ADMIN_ID, content: 'We are on it' };
    prisma.supportMessage.create.mockResolvedValue(reply);
    prisma.supportTicket.update.mockResolvedValue({ ...mockTicket, status: 'WAITING_USER' });

    const result = await service.adminReply(ADMIN_ID, TICKET_ID, 'We are on it');

    expect(result).toEqual(reply);
    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: {
        status: 'WAITING_USER',
        assignedAdminId: ADMIN_ID,
      },
    });
  });
});
