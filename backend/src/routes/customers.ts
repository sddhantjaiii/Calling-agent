import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { CustomersController } from '../controllers/customersController';

const router = Router();
const customersController = new CustomersController();

// Get all customers with filtering and pagination
router.get('/', authenticateToken, customersController.getCustomers.bind(customersController) as any);

// Get customer analytics/stats
router.get('/analytics', authenticateToken, customersController.getCustomerAnalytics.bind(customersController) as any);

// Convert lead to customer
router.post('/convert', authenticateToken, customersController.convertLeadToCustomer.bind(customersController) as any);

// Get specific customer with timeline
router.get('/:id', authenticateToken, customersController.getCustomer.bind(customersController) as any);

// Update customer
router.put('/:id', authenticateToken, customersController.updateCustomer.bind(customersController) as any);
router.patch('/:id', authenticateToken, customersController.updateCustomer.bind(customersController) as any);

export default router;
