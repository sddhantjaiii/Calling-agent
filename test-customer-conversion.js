// Test script for customer conversion functionality
// This can be run in the browser console to test the API

async function testCustomerConversion() {
  console.log('Testing customer conversion API...');
  
  // Test data - this would normally come from a lead in the system
  const testLeadData = {
    id: 'test-phone-123', // This could be a phone number if no contact exists
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    company: 'Test Company',
    source: 'Lead Intelligence'
  };

  const testCustomerData = {
    name: 'John Doe',
    email: 'john.doe@example.com', 
    phone: '+1234567890',
    company: 'Test Company',
    status: 'Active',
    assignedSalesRep: 'Sales Rep Name',
    notes: 'Test conversion from lead intelligence'
  };

  try {
    console.log('Sending conversion request with data:', { testLeadData, testCustomerData });
    
    // This would be called from the frontend
    const response = await fetch('/api/customers/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        contactId: testLeadData.id,
        name: testCustomerData.name,
        email: testCustomerData.email,
        phone: testCustomerData.phone,
        company: testCustomerData.company,
        originalLeadSource: testLeadData.source,
        assignedSalesRep: testCustomerData.assignedSalesRep,
        notes: testCustomerData.notes
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Customer conversion successful:', result);
      return result;
    } else {
      console.error('❌ Customer conversion failed:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error during conversion:', error);
    return null;
  }
}

// Usage:
// testCustomerConversion().then(result => console.log('Final result:', result));

console.log('Customer conversion test function loaded. Call testCustomerConversion() to test.');
