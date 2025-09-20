# Enhanced Lead Components

This directory contains enhanced lead display components that support the webhook lead extraction enhancement features, including company names and CTA interaction indicators.

## Components

### EnhancedLeadCard

A card component for displaying individual lead information with enhanced features:

- **Company Names**: Displays extracted company names from webhook data
- **CTA Indicators**: Shows badges for different CTA interactions (pricing, demo, follow-up, sample, human escalation)
- **Lead Scoring**: Visual representation of lead scores with color coding
- **Responsive Design**: Works on mobile and desktop
- **Accessibility**: Proper ARIA labels and keyboard navigation

#### Usage

```tsx
import { EnhancedLeadCard, type EnhancedLead } from '@/components/leads';

const lead: EnhancedLead = {
  id: '1',
  name: 'John Smith',
  email: 'john.smith@techcorp.com',
  phone: '+1-555-0123',
  companyName: 'TechCorp Solutions', // Enhanced feature
  extractedName: 'John Smith',
  extractedEmail: 'john.smith@techcorp.com',
  totalScore: 85,
  leadStatusTag: 'Hot',
  intentScore: 90,
  urgencyScore: 80,
  budgetScore: 85,
  fitScore: 88,
  engagementScore: 82,
  ctaInteractions: { // Enhanced feature
    ctaPricingClicked: true,
    ctaDemoClicked: true,
    ctaFollowupClicked: false,
    ctaSampleClicked: true,
    ctaEscalatedToHuman: false
  },
  createdAt: '2024-01-15T10:30:00Z',
  source: 'Website',
  status: 'qualified'
};

<EnhancedLeadCard
  lead={lead}
  onViewDetails={(leadId) => console.log('View details:', leadId)}
  onContact={(leadId) => console.log('Contact:', leadId)}
  onScheduleDemo={(leadId) => console.log('Schedule demo:', leadId)}
  compact={false}
/>
```

#### Props

- `lead: EnhancedLead` - The lead data to display
- `onViewDetails?: (leadId: string) => void` - Callback for view details action
- `onContact?: (leadId: string) => void` - Callback for contact action
- `onScheduleDemo?: (leadId: string) => void` - Callback for schedule demo action
- `className?: string` - Additional CSS classes
- `compact?: boolean` - Whether to use compact display mode

### EnhancedLeadsList

A list component for displaying multiple enhanced lead cards:

```tsx
import { EnhancedLeadsList } from '@/components/leads';

<EnhancedLeadsList
  leads={leads}
  onViewDetails={handleViewDetails}
  onContact={handleContact}
  onScheduleDemo={handleScheduleDemo}
  loading={false}
  error={null}
  compact={false}
  gridView={true}
/>
```

#### Props

- `leads: EnhancedLead[]` - Array of lead data
- `onViewDetails?: (leadId: string) => void` - Callback for view details action
- `onContact?: (leadId: string) => void` - Callback for contact action
- `onScheduleDemo?: (leadId: string) => void` - Callback for schedule demo action
- `loading?: boolean` - Whether data is loading
- `error?: string | null` - Error message to display
- `emptyMessage?: string` - Message to show when no leads
- `className?: string` - Additional CSS classes
- `compact?: boolean` - Whether to use compact display mode
- `gridView?: boolean` - Whether to use grid layout

### EnhancedLeadCardDemo

A demo component showing all the features of the enhanced lead components:

```tsx
import { EnhancedLeadCardDemo } from '@/components/leads';

<EnhancedLeadCardDemo />
```

## Enhanced Features

### 1. Company Name Display

The components now display company names extracted from webhook data:

- Shows company name with building icon
- Gracefully handles missing company names
- Uses `companyName` field from enhanced lead data

### 2. CTA Interaction Indicators

Visual badges show which CTAs the lead has interacted with:

- **Pricing** (💰): Green badge when `ctaPricingClicked` is true
- **Demo** (▶️): Blue badge when `ctaDemoClicked` is true
- **Follow-up** (📅): Purple badge when `ctaFollowupClicked` is true
- **Sample** (📄): Indigo badge when `ctaSampleClicked` is true
- **Human** (👤): Red badge when `ctaEscalatedToHuman` is true

### 3. Responsive Design

- Mobile-first design approach
- Flexible grid layouts for different screen sizes
- Compact mode for dense information display
- Touch-friendly action buttons

### 4. Accessibility

- Proper ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly content
- High contrast color schemes for dark/light themes

## Data Structure

The `EnhancedLead` interface extends the basic lead data with webhook enhancement fields:

```typescript
interface EnhancedLead {
  // Basic lead info
  id: string;
  name: string;
  email: string;
  phone: string;
  
  // Enhanced webhook extraction fields
  companyName?: string;        // NEW: Company name from webhook
  extractedName?: string;      // NEW: Extracted name from webhook
  extractedEmail?: string;     // NEW: Extracted email from webhook
  
  // Lead scoring
  totalScore: number;
  leadStatusTag: string;
  intentScore: number;
  urgencyScore: number;
  budgetScore: number;
  fitScore: number;
  engagementScore: number;
  
  // Enhanced CTA interactions
  ctaInteractions: {           // NEW: Dedicated CTA fields
    ctaPricingClicked: boolean;
    ctaDemoClicked: boolean;
    ctaFollowupClicked: boolean;
    ctaSampleClicked: boolean;
    ctaEscalatedToHuman: boolean;
  };
  
  // Metadata
  createdAt: string;
  source?: string;
  status?: string;
}
```

## Integration with Existing System

These components are designed to work alongside the existing lead management system:

1. **Backward Compatibility**: Falls back to existing lead data when enhanced fields are not available
2. **Theme Support**: Integrates with the existing dark/light theme system
3. **Consistent Styling**: Uses the same design tokens and components as the rest of the application
4. **API Integration**: Ready to work with the enhanced webhook processing backend

## Testing

The components include comprehensive tests covering:

- Rendering with complete lead data
- Graceful handling of missing data
- CTA badge display logic
- Action button callbacks
- Responsive behavior
- Accessibility features

Run tests with:

```bash
npm test -- src/components/leads/__tests__/
```

## Requirements Fulfilled

This implementation fulfills the following requirements from the webhook lead extraction enhancement spec:

- **US-1.1**: Company names displayed in lead listings and details
- **US-1.2**: CTA interaction badges/indicators shown
- **Technical**: Responsive design and accessibility compliance
- **Technical**: Graceful handling of missing company names