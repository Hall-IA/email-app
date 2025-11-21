interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ message = 'Chargement...', size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const dotSizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <div className="mt-6 flex items-center justify-center py-12">
      <div className="text-center">
        <div className="relative mb-6 inline-block">
          {/* Cercle extérieur avec gradient orange */}
          <div
            className={`inline-block ${sizeClasses[size]} animate-spin rounded-full border-4 border-transparent`}
            style={{
              borderTopColor: '#FE9736',
              borderRightColor: '#F4664C',
              borderBottomColor: '#FE9736',
              borderLeftColor: 'transparent',
            }}
          ></div>
          {/* Point central orange qui pulse */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className={`${dotSizeClasses[size]} animate-pulse rounded-full bg-gradient-to-br from-orange-400 to-orange-600`}></div>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  );
}

