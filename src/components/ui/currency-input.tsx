import { forwardRef, useState, useEffect } from 'react'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string
  error?: string
  value: number | null | undefined
  onChange: (value: number | null) => void
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ label, error, value, onChange, className = '', id, ...props }, ref) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    
    const [displayValue, setDisplayValue] = useState('')

    useEffect(() => {
      if (value !== null && value !== undefined) {
        setDisplayValue(formatToBRL(value))
      } else {
        setDisplayValue('')
      }
    }, [value])

    function formatToBRL(val: number): string {
      return val.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const rawValue = e.target.value.replace(/\D/g, '')
      
      if (rawValue === '') {
        setDisplayValue('')
        onChange(null)
        return
      }

      const numericValue = parseFloat(rawValue) / 100
      setDisplayValue(formatToBRL(numericValue))
      onChange(numericValue)
    }

    function handleBlur() {
      if (value !== null && value !== undefined) {
        setDisplayValue(formatToBRL(value))
      }
    }

    const baseStyles = 'w-full px-3 py-2.5 text-sm bg-background border border-border rounded-md transition-colors placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50'

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">
            R$
          </span>
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`${baseStyles} pl-10 ${error ? 'border-error focus:ring-error' : ''} ${className}`}
            placeholder="0,00"
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
      </div>
    )
  }
)

