/**
 * Locked CodeSequence increments (CL-, SUP-, TXN-, product prefixes).
 * Call inside a Prisma transaction so concurrent creates cannot collide.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class CodesService {
  async nextCode(
    tx: Prisma.TransactionClient,
    sequenceId: string,
  ): Promise<string> {
    const row = await tx.codeSequence.update({
      where: { id: sequenceId },
      data: { nextValue: { increment: 1 } },
    });
    return `${row.prefix}-${String(row.nextValue - 1).padStart(6, '0')}`;
  }
}
