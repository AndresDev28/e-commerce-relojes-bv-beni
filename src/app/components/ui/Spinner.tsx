import clsx from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white';
  className?: string;
}

export default function Spinner({ 
  size = 'md', 
  variant = 'primary',
  className 
}: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const variants = {
    primary: 'border-blue-500',
    white: 'border-white'
  };

  return (
    <div
      className={clsx(
        'rounded-full border-2 border-t-transparent',
        'animate-[spin_1s_linear_infinite]', // Animación más específica
        sizes[size],
        variants[variant],
        className
      )}
      arial-label= "Cargando..." // Mejora de accesibilidad
    />
  );
}