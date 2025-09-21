import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCodeSelector } from './CountryCodeSelector';
import { cn } from '@/lib/utils';

interface PhoneNumberInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  touched?: boolean;
  required?: boolean;
  description?: string;
  className?: string;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  placeholder = "Enter phone number",
  disabled = false,
  error,
  touched,
  required = false,
  description,
  className,
}) => {
  const [countryCode, setCountryCode] = useState('+91'); // Default to India
  const [phoneNumber, setPhoneNumber] = useState('');

  // Parse the initial value to separate country code and phone number
  useEffect(() => {
    if (value) {
      // Try to extract country code from the value
      // Handle both formats: "+91 8979556941" and "+918979556941"
      const match = value.match(/^(\+\d{1,4})\s*(.*)$/);
      if (match) {
        const extractedCountryCode = match[1];
        const remainingNumber = match[2];
        
        // If there's no space and we have a long string, try to identify common country codes
        if (!remainingNumber || remainingNumber.length === 0) {
          // Try to split common country codes like +91, +1, +44, etc.
          const commonCodes = ['+91', '+1', '+44', '+33', '+49', '+86', '+81', '+61', '+82'];
          for (const code of commonCodes) {
            if (value.startsWith(code)) {
              setCountryCode(code);
              setPhoneNumber(value.substring(code.length));
              return;
            }
          }
          // Fallback: assume it's just the phone number
          setCountryCode('+91');
          setPhoneNumber(value);
        } else {
          setCountryCode(extractedCountryCode);
          setPhoneNumber(remainingNumber);
        }
      } else {
        // If no country code found, assume it's just the phone number
        setCountryCode('+91');
        setPhoneNumber(value);
      }
    } else {
      setPhoneNumber('');
    }
  }, [value]);

  // Update the combined value when country code or phone number changes
  const updateCombinedValue = (newCountryCode: string, newPhoneNumber: string) => {
    const trimmedNumber = newPhoneNumber.trim();
    const combinedValue = trimmedNumber ? `${newCountryCode} ${trimmedNumber}` : '';
    onChange(combinedValue);
  };

  const handleCountryCodeChange = (newCountryCode: string) => {
    setCountryCode(newCountryCode);
    updateCombinedValue(newCountryCode, phoneNumber);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value;
    setPhoneNumber(newPhoneNumber);
    updateCombinedValue(countryCode, newPhoneNumber);
  };

  const showError = touched && error;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="flex">
        <CountryCodeSelector
          value={countryCode}
          onChange={handleCountryCodeChange}
          disabled={disabled}
        />
        <Input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "rounded-l-none border-l-0 focus-visible:ring-offset-0",
            showError && "border-red-500 focus-visible:ring-red-500"
          )}
        />
      </div>

      {description && !showError && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {showError && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default PhoneNumberInput;