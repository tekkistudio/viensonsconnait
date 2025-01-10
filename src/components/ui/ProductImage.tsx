import Image from 'next/image';
import { cn } from '../../lib/utils';

interface ProductImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}

export function ProductImage({
  src,
  alt,
  width = 800,
  height = 800,
  priority = false,
  className
}: ProductImageProps) {
  return (
    <div className={cn('relative aspect-square overflow-hidden rounded-lg', className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="object-cover"
        sizes="(max-width: 640px) 100vw,
               (max-width: 1024px) 50vw,
               33vw"
        quality={90}
      />
    </div>
  );
}