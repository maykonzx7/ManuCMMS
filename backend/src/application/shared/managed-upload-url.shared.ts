import { BadRequestException } from '@nestjs/common';

export function assertManagedUploadUrl(
  url: string | null | undefined,
  isManaged: (value: string | null | undefined) => boolean,
  fieldLabel: string,
): void {
  if (url == null) return;
  if (!isManaged(url)) {
    throw new BadRequestException(`URL de ${fieldLabel} inválida`);
  }
}

/** URLs substituídas que podem ser removidas do storage após persistência bem-sucedida. */
export function collectReplacedManagedUrls(
  pairs: Array<{
    previous: string | null | undefined;
    next: string | null | undefined;
  }>,
): string[] {
  const toDelete: string[] = [];
  for (const { previous, next } of pairs) {
    const prev = previous?.trim();
    const nxt = next?.trim() ?? null;
    if (prev && prev !== nxt) {
      toDelete.push(prev);
    }
  }
  return toDelete;
}
