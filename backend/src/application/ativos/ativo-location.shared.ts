import { BadRequestException } from '@nestjs/common';

const LOCALIZACAO_MAX = 255;

export function normalizeAtivoLocalizacao(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return '';
  if (normalized.length > LOCALIZACAO_MAX) {
    throw new BadRequestException(
      `localizacao deve ter até ${LOCALIZACAO_MAX} caracteres`,
    );
  }
  return normalized;
}

export function normalizeAtivoCoordenada(
  value: number | null | undefined,
  field: 'latitude' | 'longitude',
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new BadRequestException(`${field} inválida`);
  }
  if (field === 'latitude' && (value < -90 || value > 90)) {
    throw new BadRequestException('latitude deve estar entre -90 e 90');
  }
  if (field === 'longitude' && (value < -180 || value > 180)) {
    throw new BadRequestException('longitude deve estar entre -180 e 180');
  }
  return value;
}
