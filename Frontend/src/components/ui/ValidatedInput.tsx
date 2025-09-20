import React, { forwardRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/uuid';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  description?: string;
  showCharCount?: boolean;
  maxLength?: number;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  description?: string;
  showCharCount?: boolean;
  maxLength?: number;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ 
    label, 
    error, 
    touched, 
    required, 
    description, 
    showCharCount, 
    maxLength, 
    className, 
    id,
    value,
    onBlur,
    ...props 
  }, ref) => {
    const inputId = id || generateId('input');
    const hasError = touched && error;
    const currentLength = String(value || '').length;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <Input
          ref={ref}
          id={inputId}
          className={cn(
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          value={value}
          onBlur={onBlur}
          {...props}
        />
        
        <div className="flex justify-between items-start min-h-[1rem]">
          <div className="flex-1">
            {hasError && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {!hasError && description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          
          {showCharCount && maxLength && (
            <div className={cn(
              "text-xs ml-2 flex-shrink-0",
              currentLength > maxLength ? "text-red-500" : "text-gray-400"
            )}>
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';

export const ValidatedTextarea = forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
  ({ 
    label, 
    error, 
    touched, 
    required, 
    description, 
    showCharCount, 
    maxLength, 
    className, 
    id,
    value,
    onBlur,
    ...props 
  }, ref) => {
    const inputId = id || generateId('textarea');
    const hasError = touched && error;
    const currentLength = String(value || '').length;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className="text-sm font-medium">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        
        <Textarea
          ref={ref}
          id={inputId}
          className={cn(
            hasError && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          value={value}
          onBlur={onBlur}
          {...props}
        />
        
        <div className="flex justify-between items-start min-h-[1rem]">
          <div className="flex-1">
            {hasError && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {!hasError && description && (
              <p className="text-sm text-gray-500">{description}</p>
            )}
          </div>
          
          {showCharCount && maxLength && (
            <div className={cn(
              "text-xs ml-2 flex-shrink-0",
              currentLength > maxLength ? "text-red-500" : "text-gray-400"
            )}>
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';