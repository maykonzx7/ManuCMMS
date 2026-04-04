import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  let matriz = await prisma.unidadeFabril.findFirst({
    where: { nome: 'Matriz' },
  });

  if (!matriz) {
    matriz = await prisma.unidadeFabril.create({
      data: {
        nome: 'Matriz',
        localizacao: 'Arcoverde — PE (dev)',
      },
    });
  }

  const ativosNaMatriz = await prisma.ativo.count({
    where: { idUnidade: matriz.id },
  });
  if (ativosNaMatriz === 0) {
    await prisma.ativo.create({
      data: {
        idUnidade: matriz.id,
        nome: 'Compressor AC-04 (dev)',
      },
    });
  }

  const ativoDev = await prisma.ativo.findFirst({
    where: { idUnidade: matriz.id },
    orderBy: { nome: 'asc' },
  });
  if (ativoDev) {
    const osNoAtivo = await prisma.ordemServico.count({
      where: { idAtivo: ativoDev.id },
    });
    if (osNoAtivo === 0) {
      await prisma.ordemServico.create({
        data: {
          idAtivo: ativoDev.id,
          tipo: 'PREDITIVA',
          descricao: 'Monitoramento térmico — seed dev',
        },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
