import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as empCtrl from '../controllers/employeeController';

const router = Router();

// Apply JWT authentication to all employee routes
router.use(authenticateToken);

// 1. Dashboard
router.get('/dashboard', empCtrl.getEmployeeDashboard);

// 2. Attendance & Confidence
router.get('/attendance', empCtrl.getEmployeeAttendance);
router.post('/attendance/clock-in', empCtrl.clockIn);
router.post('/attendance/clock-out', empCtrl.clockOut);
router.post('/attendance/break', empCtrl.toggleBreak);

// 3. My Leads & Timeline
router.get('/leads', empCtrl.getEmployeeLeads);
router.get('/leads/:id', empCtrl.getEmployeeLeadById);
router.put('/leads/:id/status', empCtrl.updateEmployeeLeadStatus);
router.get('/leads/:id/ai-suggestions', empCtrl.getAIFollowUpSuggestions);

// 4. Follow-ups
router.get('/follow-ups', empCtrl.getEmployeeFollowUps);
router.post('/follow-ups', empCtrl.createEmployeeFollowUp);
router.patch('/follow-ups/:id', empCtrl.updateFollowUpStatus);

// 5. Calls & Recordings
router.get('/calls', empCtrl.getEmployeeCalls);
router.post('/calls', empCtrl.logEmployeeCall);

// 6. Messages (WhatsApp, SMS, Email)
router.get('/messages', empCtrl.getEmployeeMessages);
router.post('/messages', empCtrl.sendEmployeeMessage);

// 7. Customers
router.get('/customers', empCtrl.getEmployeeCustomers);
router.post('/customers', empCtrl.createEmployeeCustomer);

// 8. Tasks & Field Visit Proofs (Modules 13, 14 & 15)
router.get('/tasks', empCtrl.getEmployeeTasks);
router.post('/tasks', empCtrl.createEmployeeTask);
router.patch('/tasks/:id', empCtrl.updateEmployeeTaskStatus);
router.post('/tasks/:id/proof', empCtrl.postTaskProof);
router.post('/tasks/:id/signature', empCtrl.postTaskSignature);

// 9. Document Attachments & Voice Notes (Modules 16 & 17)
router.get('/attachments', empCtrl.getDocumentAttachments);
router.post('/attachments', empCtrl.postDocumentAttachment);
router.get('/voice-notes', empCtrl.getVoiceNotes);
router.post('/voice-notes', empCtrl.postVoiceNote);

// 10. Unified Workday Timeline & Story (Modules 22 & 23)
router.get('/workday/timeline', empCtrl.getWorkdayTimeline);
router.get('/workday/summary', empCtrl.getWorkdayStory);

// 11. Shift Handover (Module 24)
router.post('/shift/handover', empCtrl.postShiftHandover);
router.get('/shift/handovers', empCtrl.getShiftHandovers);

// 12. Nearby Assigned Work Discovery (Module 32)
router.get('/nearby-work', empCtrl.getNearbyWork);

// 13. Travel Mileage Expenses & Receipts (Modules 33 & 34)
router.get('/travel-expenses', empCtrl.getTravelExpenses);
router.post('/travel-expenses', empCtrl.postTravelExpense);

// 14. Safety & SOS (Module 25)
router.post('/safety/sos', empCtrl.postSafetySos);
router.post('/safety/check-in', empCtrl.postSafetyCheckIn);
router.get('/safety/events', empCtrl.getSafetyEvents);

// 15. Manager Feedback (Module 29)
router.get('/feedback', empCtrl.getManagerFeedback);
router.post('/feedback', empCtrl.postManagerFeedback);

// 16. Quotations
router.get('/quotations', empCtrl.getEmployeeQuotations);
router.post('/quotations', empCtrl.createEmployeeQuotation);

// 17. Sales Orders
router.get('/sales-orders', empCtrl.getEmployeeSalesOrders);

// 18. Performance
router.get('/performance', empCtrl.getEmployeePerformance);

// 19. Leave
router.get('/leave', empCtrl.getEmployeeLeaves);
router.post('/leave', empCtrl.applyEmployeeLeave);
router.put('/leave/:id', empCtrl.updateEmployeeLeave);
router.delete('/leave/:id', empCtrl.cancelEmployeeLeave);

// 20. Salary
router.get('/salary', empCtrl.getEmployeeSalary);

// 21. Profile
router.get('/profile', empCtrl.getEmployeeProfile);
router.put('/profile', empCtrl.updateEmployeeProfile);

// 22. Notifications
router.get('/notifications', empCtrl.getEmployeeNotifications);
router.patch('/notifications/:id/read', empCtrl.markNotificationRead);

export default router;
