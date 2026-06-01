import { useEffect, useState, type InputHTMLAttributes } from 'react';

type DecimalInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
};

const sanitizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = cleaned.split('.');
  return decimalParts.length > 0 ? `${integerPart}.${decimalParts.join('')}` : integerPart;
};

const toDisplayValue = (value: number) => (Number.isFinite(value) ? String(value) : '');

const DecimalInput = ({ value, onValueChange, onBlur, onFocus, ...props }: DecimalInputProps) => {
  const [displayValue, setDisplayValue] = useState(toDisplayValue(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(toDisplayValue(value));
    }
  }, [isFocused, value]);

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        const normalized = displayValue === '' || displayValue === '.' ? toDisplayValue(value) : String(Number(displayValue));
        setDisplayValue(normalized);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const nextDisplayValue = sanitizeDecimal(event.target.value);
        setDisplayValue(nextDisplayValue);

        if (nextDisplayValue === '') {
          onValueChange(0);
          return;
        }

        if (nextDisplayValue !== '.') {
          const nextValue = Number(nextDisplayValue);
          if (Number.isFinite(nextValue)) {
            onValueChange(nextValue);
          }
        }
      }}
    />
  );
};

export default DecimalInput;
