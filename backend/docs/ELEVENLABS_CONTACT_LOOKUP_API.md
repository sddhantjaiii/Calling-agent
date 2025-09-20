# ElevenLabs Contact Lookup API Documentation

This document describes the Contact Lookup API endpoints that ElevenLabs can use to check for existing contacts in our database during calls.

## Overview

The Contact Lookup API allows ElevenLabs agents to:
1. Check if a phone number exists in our contact database
2. Retrieve contact information (name, company) to personalize conversations
3. Avoid asking for information we already have

## Authentication

The API supports optional API key authentication:
- **Without API Key**: Requests work but are logged as unauthenticated
- **With API Key**: Requests are authenticated and have higher rate limits

### API Key Header
```
X-API-Key: your-api-key-here
```

### Valid API Keys
- ElevenLabs API Key (configured in environment)
- External API Key (configured in environment)
- Development Key: `contact-lookup-key-dev`

## Endpoints

### 1. Single Contact Lookup

**Endpoint:** `GET /api/contacts/lookup/:phone`

**Description:** Look up a single contact by phone number.

**Parameters:**
- `phone` (path parameter): Phone number to look up (supports various formats)

**Phone Number Formats Supported:**
- `+1234567890` (international format)
- `1234567890` (will be normalized to +1234567890)
- `(123) 456-7890` (will be normalized)

**Response Format:**

**Contact Found:**
```json
{
  "success": true,
  "data": {
    "found": true,
    "name": "John Doe",
    "company": "Example Corp",
    "hasEmail": true,
    "hasNotes": true
  }
}
```

**Contact Not Found:**
```json
{
  "success": true,
  "data": {
    "found": false,
    "message": "No contact found for this phone number"
  }
}
```

**Error Response:**
```json
{
  "error": "Invalid phone number format",
  "message": "Please provide a valid phone number"
}
```

### 2. Batch Contact Lookup

**Endpoint:** `POST /api/contacts/lookup/batch`

**Description:** Look up multiple contacts at once for efficiency.

**Request Body:**
```json
{
  "phones": ["+1234567890", "+9876543210", "+5555555555"]
}
```

**Constraints:**
- Maximum 100 phone numbers per request
- All phone numbers must be valid format

**Response Format:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "phone": "+1234567890",
        "found": true,
        "name": "John Doe",
        "company": "Example Corp",
        "hasEmail": true,
        "hasNotes": true
      },
      {
        "phone": "+9876543210",
        "found": false,
        "name": null,
        "company": null,
        "hasEmail": false,
        "hasNotes": false
      }
    ],
    "summary": {
      "total": 2,
      "found": 1,
      "notFound": 1
    }
  }
}
```

## Usage Examples

### cURL Examples

**Single Lookup (No API Key):**
```bash
curl -X GET "https://your-domain.com/api/contacts/lookup/+1234567890"
```

**Single Lookup (With API Key):**
```bash
curl -X GET "https://your-domain.com/api/contacts/lookup/+1234567890" \
  -H "X-API-Key: your-api-key"
```

**Batch Lookup:**
```bash
curl -X POST "https://your-domain.com/api/contacts/lookup/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "phones": ["+1234567890", "+9876543210"]
  }'
```

### JavaScript/Node.js Examples

**Single Lookup:**
```javascript
const axios = require('axios');

async function lookupContact(phoneNumber) {
  try {
    const response = await axios.get(
      `https://your-domain.com/api/contacts/lookup/${phoneNumber}`,
      {
        headers: {
          'X-API-Key': 'your-api-key'
        }
      }
    );
    
    if (response.data.data.found) {
      console.log(`Contact found: ${response.data.data.name}`);
      return response.data.data;
    } else {
      console.log('Contact not found');
      return null;
    }
  } catch (error) {
    console.error('Lookup failed:', error.response?.data || error.message);
    return null;
  }
}
```

**Batch Lookup:**
```javascript
async function batchLookupContacts(phoneNumbers) {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/contacts/lookup/batch',
      { phones: phoneNumbers },
      {
        headers: {
          'X-API-Key': 'your-api-key',
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.data.results;
  } catch (error) {
    console.error('Batch lookup failed:', error.response?.data || error.message);
    return [];
  }
}
```

## Integration with ElevenLabs Agents

### Agent Configuration

When configuring your ElevenLabs agent, you can use the contact lookup API to:

1. **Pre-call Contact Check**: Before starting a conversation, check if the contact exists
2. **Dynamic Conversation Flow**: Adjust the conversation based on available contact information
3. **Personalization**: Use the contact's name and company information

### Example Agent Prompt Integration

```
Before starting the conversation, check if we have information about this contact:

1. Call the contact lookup API: GET /api/contacts/lookup/{phone_number}
2. If contact found:
   - Use their name: "Hi [name], this is..."
   - Reference their company if available: "I'm calling regarding [company]..."
   - Skip asking for basic information we already have
3. If contact not found:
   - Use standard greeting: "Hi, may I ask who I'm speaking with?"
   - Collect basic information as usual

This ensures a personalized experience for existing contacts while maintaining professionalism for new contacts.
```

## Rate Limiting

- **Unauthenticated requests**: 100 requests per hour per IP
- **Authenticated requests**: 1000 requests per hour per API key
- **Batch requests**: Count as number of phones in the batch

## Error Handling

### Common Error Codes

- `400 Bad Request`: Invalid phone number format or missing required parameters
- `401 Unauthorized`: Invalid API key (when API key is provided)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error during lookup

### Best Practices

1. **Always handle errors gracefully**: Don't let API failures break your agent flow
2. **Use batch lookup for multiple contacts**: More efficient than individual requests
3. **Cache results temporarily**: Avoid repeated lookups for the same phone number
4. **Validate phone numbers**: Ensure proper format before making requests
5. **Implement retry logic**: Handle temporary failures with exponential backoff

## Security Considerations

1. **Phone Number Privacy**: Phone numbers are logged but truncated in logs for privacy
2. **API Key Security**: Keep API keys secure and rotate them regularly
3. **Rate Limiting**: Prevents abuse and ensures fair usage
4. **Input Validation**: All inputs are validated and sanitized

## Testing

Use the provided test script to verify integration:

```bash
# Run the contact lookup test script
npm run test:contact-lookup
```

Or test manually with the endpoints above using your preferred HTTP client.

## Support

For integration support or questions:
1. Check the API logs for detailed error information
2. Verify phone number formats are correct
3. Ensure API keys are properly configured
4. Contact the development team for assistance

## Changelog

- **v1.0.0**: Initial implementation with single and batch lookup
- **v1.0.1**: Added optional API key authentication
- **v1.0.2**: Improved phone number normalization and validation