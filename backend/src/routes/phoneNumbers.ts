import { Router } from 'express';
import { PhoneNumberController } from '../controllers/PhoneNumberController';
import { logAdminAction } from '../middleware/adminAuth';

const router = Router();

// All routes require authentication and admin privileges (applied via admin.ts)

// GET /api/admin/phone-numbers - Get all phone numbers with filtering and pagination
router.get(
  '/',
  logAdminAction('LIST_PHONE_NUMBERS', 'phone_number'),
  PhoneNumberController.getAllPhoneNumbers
);

// GET /api/admin/phone-numbers/stats - Get phone number statistics
router.get(
  '/stats',
  logAdminAction('VIEW_PHONE_NUMBER_STATS', 'phone_number'),
  PhoneNumberController.getPhoneNumberStats
);

// GET /api/admin/phone-numbers/assignable-users - Get users that can be assigned phone numbers
router.get(
  '/assignable-users',
  logAdminAction('LIST_ASSIGNABLE_USERS', 'user'),
  PhoneNumberController.getAssignableUsers
);

// GET /api/admin/phone-numbers/:id - Get phone number by ID
router.get(
  '/:id',
  logAdminAction('VIEW_PHONE_NUMBER', 'phone_number'),
  PhoneNumberController.getPhoneNumberById
);

// POST /api/admin/phone-numbers - Create new phone number
router.post(
  '/',
  logAdminAction('CREATE_PHONE_NUMBER', 'phone_number'),
  PhoneNumberController.createPhoneNumber
);

// PUT /api/admin/phone-numbers/:id - Update phone number
router.put(
  '/:id',
  logAdminAction('UPDATE_PHONE_NUMBER', 'phone_number'),
  PhoneNumberController.updatePhoneNumber
);

// POST /api/admin/phone-numbers/:id/assign - Assign phone number to user
router.post(
  '/:id/assign',
  logAdminAction('ASSIGN_PHONE_NUMBER', 'phone_number'),
  PhoneNumberController.assignPhoneNumber
);

// DELETE /api/admin/phone-numbers/:id - Delete phone number (hard delete)
router.delete(
  '/:id',
  logAdminAction('DELETE_PHONE_NUMBER', 'phone_number'),
  PhoneNumberController.deletePhoneNumber
);

export default router;