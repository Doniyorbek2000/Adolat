import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  SupportMessage,
  SupportPriority,
  SupportTicket,
  SupportTicketStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------
  // User-facing
  // ----------------------------------------------------------------

  async createTicket(
    userId: string,
    dto: CreateTicketDto,
  ): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        category: dto.category ?? null,
        status: SupportTicketStatus.OPEN,
        priority: SupportPriority.NORMAL,
        messages: {
          create: {
            senderUserId: userId,
            content: dto.initialMessage,
          },
        },
      },
    });

    this.logger.log(`Support ticket created: ${ticket.id} by user ${userId}`);
    return ticket;
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getTicket(
    userId: string,
    ticketId: string,
  ): Promise<SupportTicket & { messages: SupportMessage[] }> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    return ticket;
  }

  async sendMessage(
    userId: string,
    ticketId: string,
    content: string,
  ): Promise<SupportMessage> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
    });

    if (!ticket) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    if (
      ticket.status === SupportTicketStatus.CLOSED ||
      ticket.status === SupportTicketStatus.RESOLVED
    ) {
      throw new ForbiddenException("Yopilgan murojaatga xabar yuborish mumkin emas");
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderUserId: userId,
        content,
      },
    });

    // Move ticket back to OPEN if it was waiting
    if (ticket.status === SupportTicketStatus.WAITING_USER) {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportTicketStatus.OPEN },
      });
    } else {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { updatedAt: new Date() },
      });
    }

    return message;
  }

  // ----------------------------------------------------------------
  // Admin
  // ----------------------------------------------------------------

  async getTicketAsAdmin(
    ticketId: string,
  ): Promise<SupportTicket & { messages: SupportMessage[] }> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { include: { profile: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Murojaat topilmadi');
    return ticket;
  }

  async getAllTickets(filter?: {
    status?: SupportTicketStatus;
    priority?: SupportPriority;
  }): Promise<SupportTicket[]> {
    return this.prisma.supportTicket.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.priority ? { priority: filter.priority } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { user: { include: { profile: true } } },
    });
  }

  async updateTicket(
    adminId: string,
    ticketId: string,
    dto: UpdateTicketDto,
  ): Promise<SupportTicket> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    const closedAt =
      dto.status === SupportTicketStatus.CLOSED || dto.status === SupportTicketStatus.RESOLVED
        ? new Date()
        : undefined;

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.assignedAdminId !== undefined ? { assignedAdminId: dto.assignedAdminId } : {}),
        ...(closedAt ? { closedAt } : {}),
      },
    });

    this.logger.log(`Admin ${adminId} updated ticket ${ticketId}: ${JSON.stringify(dto)}`);
    return updated;
  }

  async adminReply(
    adminId: string,
    ticketId: string,
    content: string,
  ): Promise<SupportMessage> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Murojaat topilmadi');
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderAdminId: adminId,
        content,
      },
    });

    // Transition ticket to IN_PROGRESS / WAITING_USER
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: SupportTicketStatus.WAITING_USER,
        assignedAdminId: adminId,
      },
    });

    return message;
  }
}
