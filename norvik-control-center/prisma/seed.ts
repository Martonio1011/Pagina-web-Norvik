import { asegurarDatosIniciales } from "../src/lib/datos-iniciales";
import { prisma } from "../src/lib/db";

asegurarDatosIniciales()
  .then(async () => {
    const tareas = await prisma.tarea.count();
    const diarias = await prisma.tareaDiaria.count();
    const productos = await prisma.producto.count();
    console.log(
      `✔ Checklist con ${tareas} tareas, ${diarias} tareas diarias y ${productos} productos.`,
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
