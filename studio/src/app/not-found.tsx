import Link from 'next/link';
import { EmptyState } from '@/components/ui';

export default function NotFound() {
  return (
    <EmptyState
      title="Aquí no hay nada"
      description="La página o el registro que buscas no existe."
      action={
        <Link href="/" className="text-sm text-[var(--color-sage)] hover:underline">
          Volver al panel →
        </Link>
      }
    />
  );
}
