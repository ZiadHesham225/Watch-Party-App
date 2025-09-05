import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon: Icon,
    iconPosition = 'left',
    children,
    disabled,
    ...props
  }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'primary':
          return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
        case 'secondary':
          return 'bg-gray-600 hover:bg-gray-700 text-white border-transparent';
        case 'outline':
          return 'bg-transparent hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400';
        case 'ghost':
          return 'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent';
        case 'danger':
          return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
        default:
          return 'bg-blue-600 hover:bg-blue-700 text-white border-transparent';
      }
    };

    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'px-3 py-1.5 text-sm';
        case 'md':
          return 'px-4 py-2 text-base';
        case 'lg':
          return 'px-6 py-3 text-lg';
        default:
          return 'px-4 py-2 text-base';
      }
    };

    const iconSizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200';
    const classes = `${baseClasses} ${getVariantClasses()} ${getSizeClasses()} ${className}`;

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className={`animate-spin -ml-1 mr-2 ${iconSizeClasses[size]}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          <>
            {Icon && iconPosition === 'left' && (
              <Icon className={`${iconSizeClasses[size]} ${children ? 'mr-2' : ''}`} />
            )}
            {children}
            {Icon && iconPosition === 'right' && (
              <Icon className={`${iconSizeClasses[size]} ${children ? 'ml-2' : ''}`} />
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
