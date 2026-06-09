import { BadRequestException } from '@nestjs/common';

export function parseOptionalOrdemServicoDate(
  value: unknown,
  field: string,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value === '') {
    return null;
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} inválida`);
  }
  return parsed;
}
