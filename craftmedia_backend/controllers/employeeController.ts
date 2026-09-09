import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { recordAuditLog } from '../middleware/audit';
import {
  LeadDoc, CustomerDoc, FollowUpDoc, CallLogDoc, TaskDoc,
  QuotationDoc, SalesOrderDoc, AttendanceDoc, SalaryDoc,
  LeaveDoc, MessageDoc, ActivityTimelineDoc, NotificationDoc,
  FieldVisitProofDoc, DocumentAttachmentDoc, VoiceNoteDoc, SafetyEventDoc,
  ManagerFeedbackDoc, TravelExpenseDraftDoc, ShiftHandoverDoc
} from '../database/types';
import {
  validateAttendanceSecurity,
  clockIn as hrClockIn,
  clockOut as hrClockOut,
  toggleBreak as hrToggleBreak
} from './peopleControllers';
import { FieldIntelligenceService } from '../services/fieldIntelligence.service';
import { GeofenceService } from '../tracking/geofence.service';

function parseAttendanceTime(value?: string) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  const date = new Date();
  date.setHours(hours, Number(match[2]), 0, 0);
  return date;
}

function calculateWorkHours(checkIn?: string, checkOut?: string) {
  const start = parseAttendanceTime(checkIn);
  const end = parseAttendanceTime(checkOut);
  if (!start || !end) return 0;
  return Number((Math.max(0, end.getTime() - start.getTime()) / 3600000).toFixed(2));
}

// Helper to resolve employee ID and Name from user
function getEmpContext(req: AuthenticatedRequest) {
  const userId = req.user?.userId || '';
  const userName = req.user?.name || '';
  const userEmail = req.user?.email || '';

  // Look up employee profile if linked
  const emp = db.employees.findOne(e => e.userId === userId || e.email.toLowerCase() === userEmail.toLowerCase() || e.name.toLowerCase() === userName.toLowerCase());
  const employeeId = emp?._id || emp?.employeeId || userId;
  const employeeName = emp?.name || userName;

  return { userId, userName, userEmail, employeeId, employeeName, employeeDoc: emp };
}

// ----------------------------------------------------
// 1. EMPLOYEE DASHBOARD
// ----------------------------------------------------
export async function getEmployeeDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId, employeeName } = getEmpContext(req);
    const today = new Date().toISOString().split('T')[0];

    // Today's attendance
    const todayAtt = db.attendance.findOne(a =>
      (a.employeeId === employeeId || a.employeeId === userId || a.employeeName.toLowerCase() === userName.toLowerCase()) &&
      a.date === today
    );

    // Assigned leads
    const assignedLeads = db.leads.find(l =>
      l.assignedTo === userId || l.assignedTo === userName || (l.assignedTo && l.assignedTo.toLowerCase() === userName.toLowerCase())
    );

    // Follow-ups
    const allFollowUps = db.followUps.find(f =>
      f.assignedTo === userId || f.assignedTo === userName || (f.assignedTo && f.assignedTo.toLowerCase() === userName.toLowerCase())
    );
    const todayFollowUps = allFollowUps.filter(f => f.scheduledAt.startsWith(today) && f.status === 'PENDING');
    const pendingFollowUps = allFollowUps.filter(f => f.status === 'PENDING');

    // Calls today
    const myCalls = db.callLogs.find(c =>
      c.employeeId === employeeId || c.employeeId === userId || c.employeeName.toLowerCase() === userName.toLowerCase()
    );
    const callsToday = myCalls.filter(c => c.timestamp.startsWith(today));

    // Messages today
    const myMessages = db.messages.find(m =>
      m.employeeId === employeeId || m.employeeId === userId || m.employeeName.toLowerCase() === userName.toLowerCase()
    );
    const messagesToday = myMessages.filter(m => m.timestamp.startsWith(today));

    // Converted leads
    const convertedLeads = assignedLeads.filter(l => l.status === 'WON');

    // Tasks
    const myTasks = db.tasks.find(t =>
      t.assignedTo === userId || t.assignedTo === userName || t.assignedToId === employeeId
    );
    const pendingTasks = myTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');

    // Recent notifications
    const unreadNotifications = db.notifications.find(n => n.userId === userId && !n.isRead);

    // Quick stats
    const stats = {
      attendance: {
        clockedIn: !!(todayAtt && todayAtt.checkIn),
        clockedOut: !!(todayAtt && todayAtt.checkOut),
        checkInTime: todayAtt?.checkIn || null,
        checkOutTime: todayAtt?.checkOut || null,
        status: todayAtt?.status || 'NOT_MARKED',
        workHours: todayAtt?.workHours || 0,
        breaks: todayAtt?.breaks || []
      },
      assignedLeadsCount: assignedLeads.length,
      todayFollowUpsCount: todayFollowUps.length,
      pendingFollowUpsCount: pendingFollowUps.length,
      callsTodayCount: callsToday.length,
      messagesTodayCount: messagesToday.length,
      convertedLeadsCount: convertedLeads.length,
      pendingTasksCount: pendingTasks.length,
      unreadNotificationsCount: unreadNotifications.length,
      totalPipelineValue: assignedLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0)
    };

    return res.json({
      success: true,
      message: 'Employee Dashboard Data Retrieved',
      data: stats
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 2. ATTENDANCE MANAGEMENT
// ----------------------------------------------------
export async function getEmployeeAttendance(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);
    const attendanceRecords = db.attendance.find(a =>
      a.employeeId === employeeId || a.employeeId === userId || a.employeeName.toLowerCase() === userName.toLowerCase()
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const today = new Date().toISOString().split('T')[0];
    const todayRecord = attendanceRecords.find(a => a.date === today) || null;

    return res.json({
      success: true,
      data: {
        today: todayRecord,
        history: attendanceRecords
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function clockIn(req: AuthenticatedRequest, res: Response) {
  return hrClockIn(req, res);
}

export async function clockOut(req: AuthenticatedRequest, res: Response) {
  return hrClockOut(req, res);
}

export async function toggleBreak(req: AuthenticatedRequest, res: Response) {
  return hrToggleBreak(req, res);
}

// ----------------------------------------------------
// 3. MY LEADS & TIMELINE
// ----------------------------------------------------
export async function getEmployeeLeads(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    const { status, search } = req.query;

    // Strict server-side ownership filter
    let leads = db.leads.find(l =>
      l.assignedTo === userId || l.assignedTo === userName || (l.assignedTo && l.assignedTo.toLowerCase() === userName.toLowerCase())
    );

    if (status && typeof status === 'string') {
      leads = leads.filter(l => l.status === status);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      leads = leads.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.companyName && l.companyName.toLowerCase().includes(q)) ||
        l.phone.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      data: leads
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getEmployeeLeadById(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    const { id } = req.params;

    const lead = db.leads.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    // Ownership check
    const isOwner = lead.assignedTo === userId || lead.assignedTo === userName || (lead.assignedTo && lead.assignedTo.toLowerCase() === userName.toLowerCase());
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access forbidden: You are not assigned to this lead.' });
    }

    // Get lead's calls, follow-ups, messages, and timeline
    const calls = db.callLogs.find(c => c.leadId === id);
    const followUps = db.followUps.find(f => f.leadId === id);
    const messages = db.messages.find(m => m.leadId === id);
    const timeline = db.activityTimeline.find(t => t.leadId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({
      success: true,
      data: {
        lead,
        calls,
        followUps,
        messages,
        timeline
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateEmployeeLeadStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeName } = getEmpContext(req);
    const { id } = req.params;
    const { status, notes } = req.body;

    const lead = db.leads.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const isOwner = lead.assignedTo === userId || lead.assignedTo === userName || (lead.assignedTo && lead.assignedTo.toLowerCase() === userName.toLowerCase());
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Access forbidden: You cannot modify unassigned leads.' });
    }

    const oldStatus = lead.status;
    const updated = db.leads.updateById(id, {
      status,
      notes: notes ? `${lead.notes || ''}\n[${new Date().toLocaleDateString()}] ${notes}`.trim() : lead.notes,
      updatedAt: new Date().toISOString()
    })!;

    // Log Activity Timeline
    db.activityTimeline.insertOne({
      leadId: id,
      employeeId: userId,
      employeeName,
      activityType: 'STATUS_CHANGED',
      description: `Stage updated from ${oldStatus} to ${status}${notes ? `: ${notes}` : ''}`,
      timestamp: new Date().toISOString()
    });

    recordAuditLog(req, 'UPDATE', 'leads', 'Employee Lead Status Update', id, { status: oldStatus }, { status });

    return res.json({
      success: true,
      message: `Lead status updated to ${status}`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 4. FOLLOW-UPS
// ----------------------------------------------------
export async function getEmployeeFollowUps(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    const { status, filter } = req.query; // filter: 'today' | 'upcoming' | 'overdue'

    let followUps = db.followUps.find(f =>
      f.assignedTo === userId || f.assignedTo === userName || (f.assignedTo && f.assignedTo.toLowerCase() === userName.toLowerCase())
    );

    const today = new Date().toISOString().split('T')[0];

    if (filter === 'today') {
      followUps = followUps.filter(f => f.scheduledAt.startsWith(today));
    } else if (filter === 'upcoming') {
      followUps = followUps.filter(f => f.scheduledAt > today && f.status === 'PENDING');
    } else if (filter === 'overdue') {
      followUps = followUps.filter(f => f.scheduledAt < today && f.status === 'PENDING');
    }

    if (status && typeof status === 'string') {
      followUps = followUps.filter(f => f.status === status);
    }

    return res.json({
      success: true,
      data: followUps.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createEmployeeFollowUp(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeName } = getEmpContext(req);
    const { leadId, customerId, type, title, description, scheduledAt, priority } = req.body;

    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Title and scheduled time are required.' });
    }

    const newFollowUp = db.followUps.insertOne({
      leadId,
      customerId,
      type: type || 'Call',
      title,
      description,
      scheduledAt,
      status: 'PENDING',
      assignedTo: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    if (leadId) {
      db.activityTimeline.insertOne({
        leadId,
        employeeId: userId,
        employeeName,
        activityType: 'FOLLOWUP_CREATED',
        description: `Scheduled ${type || 'Call'}: ${title} on ${new Date(scheduledAt).toLocaleString()}`,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: 'Follow-up task scheduled successfully',
      data: newFollowUp
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateFollowUpStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeName } = getEmpContext(req);
    const { id } = req.params;
    const { status, outcomeNotes } = req.body;

    const followUp = db.followUps.findById(id);
    if (!followUp) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    const isOwner = followUp.assignedTo === userId || followUp.assignedTo === userName || (followUp.assignedTo && followUp.assignedTo.toLowerCase() === userName.toLowerCase());
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot update other staff follow-up.' });
    }

    const updated = db.followUps.updateById(id, {
      status,
      outcomeNotes,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    })!;

    if (followUp.leadId && status === 'COMPLETED') {
      db.activityTimeline.insertOne({
        leadId: followUp.leadId,
        employeeId: userId,
        employeeName,
        activityType: 'FOLLOWUP_COMPLETED',
        description: `Completed follow-up "${followUp.title}"${outcomeNotes ? `: ${outcomeNotes}` : ''}`,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `Follow-up marked as ${status}`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 5. CALLS & RECORDINGS
// ----------------------------------------------------
export async function getEmployeeCalls(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);
    const calls = db.callLogs.find(c =>
      c.employeeId === employeeId || c.employeeId === userId || c.employeeName.toLowerCase() === userName.toLowerCase()
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({
      success: true,
      data: calls
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function logEmployeeCall(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId, employeeName } = getEmpContext(req);
    const {
      leadId, direction, durationSeconds, outcome, notes,
      recordingUrl, recordingName, followUpDate, followUpNotes, updateLeadStatus
    } = req.body;

    const lead = leadId ? db.leads.findById(leadId) : null;

    const callLog = db.callLogs.insertOne({
      leadId: leadId || '',
      leadName: lead?.name || 'Prospect',
      leadPhone: lead?.phone || '',
      employeeId: employeeId || userId,
      employeeName,
      direction: direction || 'OUTBOUND',
      durationSeconds: Number(durationSeconds) || 0,
      outcome: outcome || 'CONNECTED',
      notes: notes || '',
      recordingUrl: recordingUrl || '',
      recordingName: recordingName || (recordingUrl ? `call_rec_${Date.now()}.wav` : ''),
      followUpDate,
      followUpNotes,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    if (leadId && lead) {
      // Activity Timeline
      db.activityTimeline.insertOne({
        leadId,
        employeeId: userId,
        employeeName,
        activityType: recordingUrl ? 'RECORDING_ATTACHED' : 'CALL_MADE',
        description: `${direction || 'Outbound'} Call (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s) - Outcome: ${outcome}. ${notes || ''}`,
        timestamp: new Date().toISOString(),
        metadata: { durationSeconds, outcome, hasRecording: !!recordingUrl }
      });

      // Update lead status if requested
      if (updateLeadStatus && updateLeadStatus !== lead.status) {
        db.leads.updateById(leadId, { status: updateLeadStatus });
      }

      // Auto-schedule follow-up if requested
      if (followUpDate) {
        db.followUps.insertOne({
          leadId,
          type: 'Call',
          title: `Follow-up call with ${lead.name}`,
          description: followUpNotes || `Follow-up after ${outcome} call`,
          scheduledAt: `${followUpDate}T11:00:00.000Z`,
          status: 'PENDING',
          assignedTo: userName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    return res.json({
      success: true,
      message: 'Call & recording saved to lead file.',
      data: callLog
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 6. MESSAGES (WhatsApp, SMS, Email)
// ----------------------------------------------------
export async function getEmployeeMessages(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);
    const { leadId } = req.query;

    let messages = db.messages.find(m =>
      m.employeeId === employeeId || m.employeeId === userId || m.employeeName.toLowerCase() === userName.toLowerCase()
    );

    if (leadId && typeof leadId === 'string') {
      messages = messages.filter(m => m.leadId === leadId);
    }

    return res.json({
      success: true,
      data: messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function sendEmployeeMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId, employeeName } = getEmpContext(req);
    const { leadId, recipientName, recipientPhone, recipientEmail, message, messageType } = req.body;

    if (!message || (!recipientPhone && !recipientEmail)) {
      return res.status(400).json({ success: false, message: 'Message content and recipient are required.' });
    }

    const newMessage = db.messages.insertOne({
      leadId,
      recipientName: recipientName || 'Customer',
      recipientPhone: recipientPhone || '',
      recipientEmail: recipientEmail || '',
      employeeId: employeeId || userId,
      employeeName,
      message,
      messageType: messageType || 'WHATSAPP',
      direction: 'OUTBOUND',
      status: 'SENT',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    if (leadId) {
      db.activityTimeline.insertOne({
        leadId,
        employeeId: userId,
        employeeName,
        activityType: 'MESSAGE_SENT',
        description: `Sent ${messageType || 'WhatsApp'} message: "${message.length > 50 ? message.substring(0, 50) + '...' : message}"`,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      message: `${messageType || 'WhatsApp'} message logged and sent successfully.`,
      data: newMessage
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 7. CUSTOMERS
// ----------------------------------------------------
export async function getEmployeeCustomers(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    const { search } = req.query;

    // Customers assigned to this employee
    let customers = db.customers.find(c =>
      c.assignedTo === userId || c.assignedTo === userName || (c.assignedTo && c.assignedTo.toLowerCase() === userName.toLowerCase())
    );

    // If none assigned directly, also include customers whose leads were converted by this employee
    if (customers.length === 0) {
      const myLeads = db.leads.find(l => l.assignedTo === userId || l.assignedTo === userName);
      const myLeadNames = myLeads.map(l => l.name.toLowerCase());
      customers = db.customers.find(c => myLeadNames.includes(c.name.toLowerCase()));
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      customers = customers.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    }

    return res.json({
      success: true,
      data: customers
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createEmployeeCustomer(req: AuthenticatedRequest, res: Response) {
  try {
    const { userName } = getEmpContext(req);
    const { name, companyName, email, phone, gstNumber, address } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone are required' });
    }

    const newCustomer = db.customers.insertOne({
      name,
      companyName: companyName || name,
      email: email || '',
      phone,
      gstNumber: gstNumber || '',
      address: address || { city: '', state: '', country: 'India' },
      assignedTo: userName,
      totalOrdersCount: 0,
      totalSpent: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'customers', 'Customer', newCustomer._id, undefined, { name, companyName });
    return res.status(201).json({ success: true, message: 'Customer created', data: newCustomer });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 8. TASKS
// ----------------------------------------------------
export async function getEmployeeTasks(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);
    const { status } = req.query;

    let tasks = db.tasks.find(t =>
      t.assignedTo === userId || t.assignedTo === userName || t.assignedToId === employeeId || (t.assignedTo && t.assignedTo.toLowerCase() === userName.toLowerCase())
    );

    if (status && typeof status === 'string') {
      tasks = tasks.filter(t => t.status === status);
    }

    return res.json({
      success: true,
      data: tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createEmployeeTask(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId, employeeName } = getEmpContext(req);
    const { title, description, priority, dueDate, relatedTo } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Title and due date are required.' });
    }

    const newTask = db.tasks.insertOne({
      title,
      description: description || '',
      assignedTo: userName,
      assignedToId: employeeId || userId,
      priority: priority || 'MEDIUM',
      dueDate,
      status: 'PENDING',
      relatedTo,
      createdBy: userName,
      createdAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateEmployeeTaskStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);
    const { id } = req.params;
    const { status, notes } = req.body;

    const task = db.tasks.findById(id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isOwner = task.assignedTo === userId || task.assignedTo === userName || task.assignedToId === employeeId;
    if (!isOwner) return res.status(403).json({ success: false, message: 'Forbidden: Cannot edit other employee tasks' });

    const updated = db.tasks.updateById(id, {
      status,
      notes,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString()
    })!;

    return res.json({
      success: true,
      message: `Task marked as ${status}`,
      data: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 9. QUOTATIONS
// ----------------------------------------------------
export async function getEmployeeQuotations(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    // Find quotations created by or assigned to this employee's customers
    const myCustomers = db.customers.find(c => c.assignedTo === userId || c.assignedTo === userName);
    const myCustomerIds = myCustomers.map(c => c._id);

    const quotations = db.quotations.find(q =>
      myCustomerIds.includes(q.customerId) || (q as any).createdBy === userName || (q as any).salesRep === userName
    );

    return res.json({
      success: true,
      data: quotations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createEmployeeQuotation(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeName } = getEmpContext(req);
    const { customerId, leadId, items, taxPercent, discountPercent, notes, validUntil } = req.body;

    let customerName = 'Walk-in Prospect';
    if (customerId) {
      const cust = db.customers.findById(customerId);
      if (cust) customerName = cust.name;
    } else if (leadId) {
      const lead = db.leads.findById(leadId);
      if (lead) customerName = lead.name;
    }

    const calculatedItems = (items || []).map((it: any) => ({
      productId: it.productId,
      productName: it.productName,
      sku: it.sku || 'SKU-GEN',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)
    }));

    const subTotal = calculatedItems.reduce((acc: number, i: any) => acc + i.total, 0);
    const taxRate = Number(taxPercent) || 18;
    const taxAmount = (subTotal * taxRate) / 100;
    const discountAmount = Number(discountPercent) ? (subTotal * Number(discountPercent)) / 100 : 0;
    const grandTotal = subTotal + taxAmount - discountAmount;

    const count = db.quotations.countDocuments() + 1;
    const quotationNumber = `QT-2026-${String(count).padStart(4, '0')}`;

    const newQuotation = db.quotations.insertOne({
      quotationNumber,
      customerId: customerId || 'lead_prospect',
      customerName,
      leadId,
      items: calculatedItems,
      subTotal,
      taxAmount,
      discountAmount,
      grandTotal,
      status: 'SENT',
      validUntil: validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: notes || 'Quotation generated via Sales Representative Portal',
      createdBy: userName,
      createdAt: new Date().toISOString()
    } as any);

    if (leadId) {
      db.activityTimeline.insertOne({
        leadId,
        employeeId: userId,
        employeeName,
        activityType: 'QUOTATION_CREATED',
        description: `Generated formal price quote ${quotationNumber} worth ₹${grandTotal.toLocaleString('en-IN')}`,
        timestamp: new Date().toISOString(),
        metadata: { quotationNumber, grandTotal }
      });
    }

    return res.json({
      success: true,
      message: `Quotation ${quotationNumber} created successfully!`,
      data: newQuotation
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 10. SALES ORDERS
// ----------------------------------------------------
export async function getEmployeeSalesOrders(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    const myCustomers = db.customers.find(c => c.assignedTo === userId || c.assignedTo === userName);
    const myCustIds = myCustomers.map(c => c._id);

    const orders = db.salesOrders.find(o =>
      myCustIds.includes(o.customerId) || (o as any).createdBy === userName || (o as any).salesRep === userName
    );

    return res.json({
      success: true,
      data: orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 11. PERFORMANCE & KPI ENGINE
// ----------------------------------------------------
export async function getEmployeePerformance(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);

    // 1. Leads assigned & converted
    const myLeads = db.leads.find(l =>
      l.assignedTo === userId || l.assignedTo === userName || (l.assignedTo && l.assignedTo.toLowerCase() === userName.toLowerCase())
    );
    const totalLeads = myLeads.length;
    const convertedLeads = myLeads.filter(l => l.status === 'WON').length;
    const contactedLeads = myLeads.filter(l => l.status !== 'NEW').length;
    const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

    // 2. Calls & Duration
    const myCalls = db.callLogs.find(c =>
      c.employeeId === employeeId || c.employeeId === userId || c.employeeName.toLowerCase() === userName.toLowerCase()
    );
    const totalCalls = myCalls.length;
    const totalDurationSeconds = myCalls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    const totalDurationMinutes = Math.round(totalDurationSeconds / 60);

    // 3. Follow-ups
    const myFollowUps = db.followUps.find(f =>
      f.assignedTo === userId || f.assignedTo === userName || (f.assignedTo && f.assignedTo.toLowerCase() === userName.toLowerCase())
    );
    const totalFollowUps = myFollowUps.length;
    const completedFollowUps = myFollowUps.filter(f => f.status === 'COMPLETED').length;
    const pendingFollowUps = myFollowUps.filter(f => f.status === 'PENDING').length;

    // 4. Quotations & Revenue
    const myQuotations = db.quotations.find(q =>
      (q as any).createdBy === userName || (q as any).salesRep === userName
    );
    const totalQuotations = myQuotations.length;
    const totalQuotedValue = myQuotations.reduce((acc, q) => acc + (q.grandTotal || 0), 0);

    // 5. Appraisals & Rating
    const appraisals = db.performance.find(p =>
      p.employeeId === employeeId || p.employeeName.toLowerCase() === userName.toLowerCase()
    );

    const performanceMetrics = {
      employeeName: userName,
      period: 'FY 2026 (Active)',
      leadsAssigned: totalLeads,
      leadsContacted: contactedLeads,
      convertedLeads,
      conversionRate: `${conversionRate}%`,
      totalCalls,
      totalCallMinutes: totalDurationMinutes,
      totalFollowUps,
      completedFollowUps,
      pendingFollowUps,
      totalQuotations,
      totalQuotedValue,
      rating: appraisals[0]?.rating || 4.8,
      appraisals
    };

    return res.json({
      success: true,
      data: performanceMetrics
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 12. LEAVE MANAGEMENT
// ----------------------------------------------------
export async function getEmployeeLeaves(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId } = getEmpContext(req);

    const leaves = db.leaves.find(l =>
      l.employeeId === employeeId || l.employeeId === userId
    ).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

    // Calculate balances
    const approvedDays = leaves
      .filter(l => l.status === 'APPROVED')
      .reduce((acc, l) => acc + (l.totalDays || 1), 0);

    const balance = {
      casualLeave: Math.max(0, 12 - Math.floor(approvedDays * 0.4)),
      sickLeave: Math.max(0, 8 - Math.floor(approvedDays * 0.3)),
      paidLeave: Math.max(0, 15 - Math.floor(approvedDays * 0.3)),
      totalTaken: approvedDays
    };

    return res.json({
      success: true,
      data: {
        leaves,
        balance
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function applyEmployeeLeave(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId, employeeName } = getEmpContext(req);
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'All leave fields are required.' });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'End date must be on or after the start date.' });
    }
    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

    const newLeave = db.leaves.insertOne({
      employeeId: employeeId || userId,
      employeeName,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'PENDING',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    recordAuditLog(req, 'CREATE', 'leave', 'Employee Leave Application', newLeave._id, undefined, {
      leaveType,
      startDate,
      endDate,
      totalDays
    });

    return res.json({
      success: true,
      message: `Leave request for ${totalDays} days submitted for Management/HR approval.`,
      data: newLeave
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateEmployeeLeave(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, employeeId, employeeName } = getEmpContext(req);
    const leave = db.leaves.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });

    const ownsLeave = leave.employeeId === employeeId || leave.employeeId === userId;
    if (!ownsLeave) return res.status(403).json({ success: false, message: 'You can only modify your own leave requests.' });

    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'All leave fields are required.' });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'End date must be on or after the start date.' });
    }

    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    const updated = db.leaves.updateById(leave._id, {
      employeeName: leave.employeeName || employeeName,
      leaveType,
      startDate,
      endDate,
      totalDays
    });

    recordAuditLog(req, 'UPDATE', 'leaves', 'Employee Leave Update', leave._id, leave, updated);
    return res.json({ success: true, message: 'Leave request updated successfully.', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function cancelEmployeeLeave(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, employeeId } = getEmpContext(req);
    const leave = db.leaves.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });

    const ownsLeave = leave.employeeId === employeeId || leave.employeeId === userId;
    if (!ownsLeave) return res.status(403).json({ success: false, message: 'You can only cancel your own leave requests.' });

    const updated = db.leaves.updateById(leave._id, {
      status: 'CANCELLED',
      reviewedBy: undefined,
      approvedBy: undefined,
      reviewedAt: new Date().toISOString(),
      reviewNotes: 'Cancelled by employee'
    });

    recordAuditLog(req, 'UPDATE', 'leaves', 'Employee Leave Cancellation', leave._id, { status: leave.status }, { status: 'CANCELLED' });
    return res.json({ success: true, message: 'Leave request cancelled successfully.', data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 13. SALARY & PAYSLIPS
// ----------------------------------------------------
export async function getEmployeeSalary(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName, employeeId, employeeDoc } = getEmpContext(req);

    const salaries = db.salaries.find(s =>
      s.employeeId === employeeId || s.employeeId === userId || s.employeeName.toLowerCase() === userName.toLowerCase()
    ).sort((a, b) => (b.month > a.month ? 1 : -1));

    const latest = salaries[0] || {
      month: '2026-01',
      basicSalary: employeeDoc?.salary || 38000,
      allowances: 7500,
      deductions: 2100,
      netSalary: (employeeDoc?.salary || 38000) + 7500 - 2100,
      paymentStatus: 'PAID'
    };

    return res.json({
      success: true,
      data: {
        latestSalary: latest,
        salaryHistory: salaries
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 14. PROFILE MANAGEMENT
// ----------------------------------------------------
export async function getEmployeeProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, employeeDoc } = getEmpContext(req);
    const user = db.users.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const profileData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || employeeDoc?.phone || '+91 98765 00112',
      role: user.role,
      avatar: user.avatar || 'AS',
      organization: user.organization || 'Craft Media Hub',
      department: employeeDoc?.department || 'Sales & Field Operations',
      designation: employeeDoc?.designation || 'Sales & Calling Executive',
      joiningDate: employeeDoc?.joiningDate || '2025-06-01',
      employeeCode: employeeDoc?.employeeId || 'EMP-007',
      bankDetails: employeeDoc?.bankDetails || {
        bankName: 'HDFC Bank Ltd',
        accountNumber: '50100234891234',
        ifsc: 'HDFC0001234'
      }
    };

    return res.json({
      success: true,
      data: profileData
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function updateEmployeeProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = getEmpContext(req);
    const { phone, avatar, password, currentPassword } = req.body;

    const user = db.users.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const updates: any = {};
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required to set new password' });
      }
      const match = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!match) {
        return res.status(400).json({ success: false, message: 'Current password does not match' });
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = db.users.updateById(userId, updates)!;

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        avatar: updated.avatar
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 15. NOTIFICATIONS
// ----------------------------------------------------
export async function getEmployeeNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId } = getEmpContext(req);
    const notifications = db.notifications.find(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      data: notifications
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { userId } = getEmpContext(req);

    if (id === 'all') {
      const myNotifs = db.notifications.find(n => n.userId === userId && !n.isRead);
      myNotifs.forEach(n => db.notifications.updateById(n._id, { isRead: true }));
      return res.json({ success: true, message: 'All notifications marked as read' });
    }

    const notif = db.notifications.findById(id);
    if (notif && notif.userId === userId) {
      db.notifications.updateById(id, { isRead: true });
    }

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 16. EMPLOYEE SAFETY & SOS (MODULE 25)
// ----------------------------------------------------
export async function postSafetySos(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { latitude, longitude, accuracy, message, address } = req.body;

    const event = db.safetyEvents.insertOne({
      employeeId,
      employeeName,
      type: 'SOS',
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      address,
      message: message || 'EMERGENCY SOS Triggered by employee',
      status: 'ACTIVE',
      timestamp: new Date().toISOString()
    });

    // Notify all Admins and Managers
    const adminUsers = db.users.find(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'MANAGER');
    for (const adm of adminUsers) {
      db.notifications.insertOne({
        userId: adm._id,
        title: `🚨 SOS EMERGENCY ALERT: ${employeeName}`,
        message: `${employeeName} triggered an emergency SOS: "${message || 'Immediate assistance required.'}"`,
        type: 'ADMIN_ALERT',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    recordAuditLog(req, 'CREATE', 'safetyEvents', 'SOS Emergency Alert', event._id, undefined, { employeeName, message });

    return res.status(201).json({
      success: true,
      message: '🚨 Emergency SOS recorded and escalated to management team.',
      data: event
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function postSafetyCheckIn(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { latitude, longitude, accuracy, message } = req.body;

    const event = db.safetyEvents.insertOne({
      employeeId,
      employeeName,
      type: 'CHECK_IN',
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      message: message || 'Employee checked in as Safe.',
      status: 'RESOLVED',
      timestamp: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: '✅ Safety check-in recorded successfully.',
      data: event
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSafetyEvents(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const events = db.safetyEvents.find(e => e.employeeId === employeeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({ success: true, data: events });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 17. FIELD VISIT PROOF & CUSTOMER SIGNATURE (MODULES 14 & 15)
// ----------------------------------------------------
export async function postTaskProof(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { id } = req.params; // taskId
    const {
      leadId,
      customerId,
      latitude,
      longitude,
      accuracy,
      selfieUrl,
      sitePhotoUrls,
      customerSignatureUrl,
      signedByName,
      notes,
      deviceId
    } = req.body;

    const task = db.tasks.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Determine verification status
    let verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'REVIEW_REQUIRED' = 'VERIFIED';
    if (!customerSignatureUrl && (!sitePhotoUrls || sitePhotoUrls.length === 0)) {
      verificationStatus = 'REVIEW_REQUIRED';
    } else if (!customerSignatureUrl || !sitePhotoUrls || sitePhotoUrls.length === 0) {
      verificationStatus = 'PARTIALLY_VERIFIED';
    }

    const proof = db.fieldVisitProofs.insertOne({
      employeeId,
      employeeName,
      taskId: id,
      leadId: leadId || (task.relatedTo && typeof task.relatedTo === 'object' && task.relatedTo.type === 'LEAD' ? task.relatedTo.id : undefined),
      customerId: customerId || (task.relatedTo && typeof task.relatedTo === 'object' && task.relatedTo.type === 'CUSTOMER' ? task.relatedTo.id : undefined),
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      selfieUrl,
      sitePhotoUrls: sitePhotoUrls || [],
      customerSignatureUrl,
      signedByName,
      notes,
      deviceId,
      verificationStatus,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    // Mark task completed
    db.tasks.updateById(id, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      notes: (task.notes ? task.notes + ' | ' : '') + `Completed with visit proof ID ${proof._id}`
    });

    // Auto-expire dynamic task geofence
    GeofenceService.expireTaskGeofence(id);

    recordAuditLog(req, 'CREATE', 'fieldVisitProofs', 'Task Visit Proof Submitted', proof._id, undefined, { taskId: id, verificationStatus });

    return res.status(201).json({
      success: true,
      message: '✅ Field visit proof submitted and task marked completed.',
      data: proof
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function postTaskSignature(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { id } = req.params;
    const { customerSignatureUrl, signedByName, notes } = req.body;

    if (!customerSignatureUrl) {
      return res.status(400).json({ success: false, message: 'Customer signature payload is required.' });
    }

    const proof = db.fieldVisitProofs.insertOne({
      employeeId,
      employeeName,
      taskId: id,
      latitude: 0,
      longitude: 0,
      customerSignatureUrl,
      signedByName: signedByName || 'Customer',
      notes: notes || 'Customer acknowledgment signature attached',
      verificationStatus: 'VERIFIED',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: '✅ Customer signature uploaded successfully.',
      data: proof
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 18. DOCUMENT ATTACHMENTS & VOICE NOTES (MODULES 16 & 17)
// ----------------------------------------------------
export async function postDocumentAttachment(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { entityType, entityId, documentType, fileUrl, fileName, fileSize, mimeType, notes } = req.body;

    if (!fileUrl || !fileName || !documentType) {
      return res.status(400).json({ success: false, message: 'fileUrl, fileName, and documentType are required.' });
    }

    const doc = db.documentAttachments.insertOne({
      employeeId,
      employeeName,
      entityType: entityType || 'GENERAL',
      entityId,
      documentType,
      fileUrl,
      fileName,
      fileSize: fileSize !== undefined ? Number(fileSize) : undefined,
      mimeType,
      notes,
      verificationStatus: 'PENDING',
      uploadedAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: '✅ Document attached successfully.',
      data: doc
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getDocumentAttachments(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const { entityType, entityId } = req.query;

    let docs = db.documentAttachments.find(d => d.employeeId === employeeId);
    if (entityType && typeof entityType === 'string') {
      docs = docs.filter(d => d.entityType === entityType);
    }
    if (entityId && typeof entityId === 'string') {
      docs = docs.filter(d => d.entityId === entityId);
    }

    return res.json({ success: true, data: docs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function postVoiceNote(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { leadId, customerId, taskId, followUpId, audioUrl, durationSeconds, transcription, notes } = req.body;

    if (!audioUrl) {
      return res.status(400).json({ success: false, message: 'audioUrl is required.' });
    }

    const voiceNote = db.voiceNotes.insertOne({
      employeeId,
      employeeName,
      leadId,
      customerId,
      taskId,
      followUpId,
      audioUrl,
      durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : undefined,
      transcription,
      notes,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: '✅ Voice note uploaded successfully.',
      data: voiceNote
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getVoiceNotes(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const { leadId, taskId } = req.query;

    let notes = db.voiceNotes.find(v => v.employeeId === employeeId);
    if (leadId && typeof leadId === 'string') {
      notes = notes.filter(v => v.leadId === leadId);
    }
    if (taskId && typeof taskId === 'string') {
      notes = notes.filter(v => v.taskId === taskId);
    }

    return res.json({ success: true, data: notes });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 19. WORKDAY TIMELINE & DAILY STORY (MODULES 22 & 23)
// ----------------------------------------------------
export async function getWorkdayTimeline(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const timeline = FieldIntelligenceService.getWorkdayTimeline(employeeId, date);
    return res.json({ success: true, data: timeline });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getWorkdayStory(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const story = FieldIntelligenceService.getDailyWorkdayStory(employeeId, date);
    return res.json({ success: true, data: story });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 20. SHIFT HANDOVER (MODULE 24)
// ----------------------------------------------------
export async function postShiftHandover(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { handoverNotes, pendingLeadIds, pendingTaskIds, followUpIds, handoverToEmployeeId, handoverToEmployeeName } = req.body;

    if (!handoverNotes) {
      return res.status(400).json({ success: false, message: 'handoverNotes is required.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const handover = db.shiftHandovers.insertOne({
      employeeId,
      employeeName,
      date: today,
      handoverNotes,
      pendingLeadIds: pendingLeadIds || [],
      pendingTaskIds: pendingTaskIds || [],
      followUpIds: followUpIds || [],
      handoverToEmployeeId,
      handoverToEmployeeName,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: '✅ Shift handover notes recorded successfully.',
      data: handover
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getShiftHandovers(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const handovers = db.shiftHandovers.find(h => h.employeeId === employeeId || h.handoverToEmployeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: handovers });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 21. NEARBY ASSIGNED WORK (MODULE 32)
// ----------------------------------------------------
export async function getNearbyWork(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Latitude (lat) and Longitude (lng) query parameters are required.' });
    }

    const nearby = FieldIntelligenceService.findNearbyAssignedWork({
      employeeId,
      latitude: parseFloat(String(lat)),
      longitude: parseFloat(String(lng)),
      maxRadiusKm: radius ? parseFloat(String(radius)) : 30
    });

    return res.json({ success: true, data: nearby });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 22. TRAVEL EXPENSES (MODULES 33 & 34)
// ----------------------------------------------------
export async function getTravelExpenses(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const claims = db.travelExpenseDrafts.find(e => e.employeeId === employeeId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, data: claims });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function postTravelExpense(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId, employeeName } = getEmpContext(req);
    const { date, distanceKm, ratePerKm, notes, manualAdjustment, status, receiptUrls } = req.body;

    const targetDate = date || new Date().toISOString().split('T')[0];
    const draft = FieldIntelligenceService.generateTravelExpenseDraft({
      employeeId,
      employeeName,
      date: targetDate,
      ratePerKm: ratePerKm !== undefined ? Number(ratePerKm) : undefined
    });

    if (manualAdjustment !== undefined || notes || status || receiptUrls) {
      const updated = db.travelExpenseDrafts.updateById(draft._id, {
        distanceKm: distanceKm !== undefined ? Number(distanceKm) : draft.distanceKm,
        manualAdjustment: manualAdjustment !== undefined ? Number(manualAdjustment) : draft.manualAdjustment,
        totalClaimAmount: (distanceKm !== undefined ? Number(distanceKm) * (ratePerKm || draft.ratePerKm) : draft.calculatedAmount) + (manualAdjustment || 0),
        notes: notes || draft.notes,
        status: status || draft.status,
        receiptUrls: receiptUrls || draft.receiptUrls,
        updatedAt: new Date().toISOString()
      });
      return res.status(201).json({ success: true, message: 'Travel expense updated', data: updated });
    }

    return res.status(201).json({ success: true, message: 'Travel expense draft ready for submission', data: draft });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 23. AI-READY FOLLOW-UP SUGGESTIONS (MODULE 30 & 31)
// ----------------------------------------------------
export async function getAIFollowUpSuggestions(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params; // leadId
    const suggestions = FieldIntelligenceService.getFollowUpSuggestions(id);
    return res.json({ success: true, data: suggestions });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ----------------------------------------------------
// 24. MANAGER FEEDBACK (MODULE 29)
// ----------------------------------------------------
export async function postManagerFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    const { userId, userName } = getEmpContext(req);
    const { employeeId, entityType, entityId, rating, remarks, verificationStatus } = req.body;

    if (!employeeId || !entityType || !entityId || !remarks) {
      return res.status(400).json({ success: false, message: 'employeeId, entityType, entityId, and remarks are required.' });
    }

    const feedback = db.managerFeedbacks.insertOne({
      employeeId,
      managerId: userId,
      managerName: userName,
      entityType,
      entityId,
      rating: rating !== undefined ? Number(rating) : undefined,
      remarks,
      verificationStatus: verificationStatus || 'APPROVED',
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({ success: true, message: 'Manager feedback recorded', data: feedback });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getManagerFeedback(req: AuthenticatedRequest, res: Response) {
  try {
    const { employeeId } = getEmpContext(req);
    const feedback = db.managerFeedbacks.find(f => f.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: feedback });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
