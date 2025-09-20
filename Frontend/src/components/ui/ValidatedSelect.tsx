import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/uuid';

interface ValidatedSelectProps {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  description?: string;
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  error,
  touched,
  required,
  description,
  placeholder,
  value,
  onValueChange,
  onBlur,
  disabled,
  children,
  className,
  id
}) => {
  const selectId = id || generateId('select');
  const hasError = touched && error;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={selectId} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id={selectId}
          className={cn(
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          onBlur={onBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
      
      <div className="min-h-[1rem]">
        {hasError && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        {!hasError && description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  );
};

export default ValidatedSelect;