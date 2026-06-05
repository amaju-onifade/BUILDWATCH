import React, { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  isLoading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'medium', fullWidth, isLoading, children, disabled, ...props }, ref) => {
    
    // Convert props to data attributes for CSS targeting as per rules
    const dataProps = {
      'data-variant': variant,
      'data-size': size,
      'data-fullwidth': fullWidth ? 'true' : undefined,
      'data-loading': isLoading ? 'true' : undefined,
    }

    return (
      <button
        ref={ref}
        className={`${styles.button} ${className || ''}`}
        disabled={disabled || isLoading}
        {...dataProps}
        {...props}
      >
        {isLoading ? <span className={styles.spinner} /> : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
