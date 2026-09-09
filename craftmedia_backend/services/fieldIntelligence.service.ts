/**
 * Enterprise Field Intelligence, AI-Ready Assist & Verification Engine
 * 
 * Provides:
 * 1. Attendance Confidence & Verification Signals
 * 2. AI-Ready Follow-up Suggestions & Lead Priority Assist
 * 3. Nearby Assigned Work Discovery
 * 4. Automated Travel Expense Drafts from Approved Route Telemetry
 * 5. Unified Chronological Workday Timeline & Story Generator
 * 6. Safety & SOS Management
 */

import { db } from '../database/db';
import {
  EmployeeDoc,
  LeadDoc,
  TaskDoc,
  CustomerDoc,
  FollowUpDoc,
  QuotationDoc,
  AttendanceDoc,
  FieldVisitProofDoc,
  TravelExpenseDraftDoc,
  ShiftHandoverDoc
} from '../database/types';
import { GeodesicService } from '../tracking/geodesic.service';

export interface AttendanceConfidenceResult {
  status: 'VERIFIED' | 'VERIFIED_WITH_WARNINGS' | 'REVIEW_REQUIRED';
  score: number; // 0 to 100
  signals: string[];
  reasons: string[];
}

export interface AIFollowUpSuggestionResult {
  aiEnabled: boolean;
  suggestedNextAction: string;
  suggestedFollowUpDate: string;
  callAgenda: string;
  messageDraft: string;
  recommendedChannel: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'VISIT';
  reason: string;
}

export interface NearbyWorkItem {
  id: string;
  type: 'TASK' | 'CUSTOMER_VISIT' | 'LEAD_FOLLOWUP';
  title: string;
  subtitle: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  latitude: number;
  longitude: number;
  distanceKm: number;
  distanceMeters: number;
  address?: string;
  dueTime?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface WorkdayTimelineEvent {
  id: string;
  type:
    | 'CLOCK_IN'
    | 'TRACKING_STARTED'
    | 'GEOFENCE_ENTER'
    | 'CLIENT_ARRIVAL'
    | 'CALL'
    | 'FOLLOW_UP'
    | 'TASK_ARRIVED'
    | 'TASK_STARTED'
    | 'PHOTO_PROOF'
    | 'QUOTATION_CREATED'
    | 'BREAK_STARTED'
    | 'BREAK_ENDED'
    | 'TASK_COMPLETED'
    | 'GEOFENCE_EXIT'
    | 'CLOCK_OUT'
    | 'TRACKING_STOPPED'
    | 'SAFETY_EVENT';
  title: string;
  description: string;
  timestamp: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    geofenceName?: string;
  };
  metadata?: Record<string, any>;
}

export class FieldIntelligenceService {
  /**
   * Evaluates transparent multi-signal Attendance Confidence without arbitrary punishment
   */
  public static evaluateAttendanceConfidence(params: {
    insideGeofence: boolean;
    accuracy?: number;
    selfiePresent: boolean;
    deviceId?: string;
    employee: EmployeeDoc;
    distanceMeters?: number;
  }): AttendanceConfidenceResult {
    const signals: string[] = [];
    const reasons: string[] = [];
    let score = 100;

    // 1. Geofence Match Signal
    if (params.insideGeofence) {
      signals.push('INSIDE_AUTHORIZED_GEOFENCE');
    } else {
      signals.push('OUTSIDE_GEOFENCE');
      score -= 30;
      reasons.push(`Punch occurred ${params.distanceMeters ? Math.round(params.distanceMeters) + 'm' : 'outside'} authorized office zone.`);
    }

    // 2. Selfie Presence Signal
    if (params.selfiePresent) {
      signals.push('LIVE_SELFIE_VERIFIED');
    } else {
      signals.push('SELFIE_MISSING');
      score -= 25;
      reasons.push('Live camera selfie was not provided or verified.');
    }

    // 3. GPS Accuracy Signal
    if (params.accuracy !== undefined) {
      if (params.accuracy <= 25) {
        signals.push('GPS_HIGH_PRECISION');
      } else if (params.accuracy <= 100) {
        signals.push('GPS_ACCEPTABLE_PRECISION');
      } else {
        signals.push('GPS_POOR_ACCURACY');
        score -= 20;
        reasons.push(`GPS precision tolerance was low (±${Math.round(params.accuracy)}m).`);
      }
    } else {
      signals.push('GPS_UNAVAILABLE');
      score -= 20;
      reasons.push('GPS coordinates were omitted.');
    }

    // 4. Device Trust Signal
    if (params.deviceId) {
      const knownDevice = db.devices?.findOne(d => d.deviceId === params.deviceId && d.employeeId === params.employee._id);
      if (knownDevice && knownDevice.status !== 'ERROR') {
        signals.push('KNOWN_TRUSTED_DEVICE');
      } else {
        signals.push('NEW_OR_UNVERIFIED_DEVICE');
        score -= 10;
        reasons.push('Login hardware identifier was not previously recognized.');
      }
    }

    let status: 'VERIFIED' | 'VERIFIED_WITH_WARNINGS' | 'REVIEW_REQUIRED' = 'VERIFIED';
    if (score < 60 || !params.insideGeofence || !params.selfiePresent) {
      status = 'REVIEW_REQUIRED';
    } else if (score < 90) {
      status = 'VERIFIED_WITH_WARNINGS';
    }

    return {
      status,
      score: Math.max(0, score),
      signals,
      reasons
    };
  }

  /**
   * AI-Ready Follow-up Suggestions with clean fallback when AI is disabled
   */
  public static getFollowUpSuggestions(leadId: string): AIFollowUpSuggestionResult {
    const aiEnabled = process.env.AI_ASSISTANT_ENABLED === 'true';
    const lead = db.leads?.findById(leadId);
    if (!lead) {
      return {
        aiEnabled: false,
        suggestedNextAction: 'Review lead requirements and schedule initial discovery call.',
        suggestedFollowUpDate: new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0],
        callAgenda: 'Understand procurement budget and project timeline.',
        messageDraft: 'Hello, thank you for reaching out to us. When would be a good time to connect?',
        recommendedChannel: 'CALL',
        reason: 'Default lead intake recommendation.'
      };
    }

    const recentCalls = db.callLogs?.find(c => c.leadId === leadId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
    const recentQuotes = db.quotations?.find(q => q.customerId === lead.convertedCustomerId || q.customerName === lead.name || q.notes?.includes(lead.name)) || [];

    const lastCall = recentCalls[0];
    const latestQuote = recentQuotes[0];

    let suggestedNextAction = 'Schedule Follow-Up Call';
    let callAgenda = `Discuss requirement for ${lead.productName || 'products'} and establish timeline.`;
    let recommendedChannel: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'VISIT' = 'CALL';
    let messageDraft = `Dear ${lead.name}, thank you for your interest in our solutions. May I share our latest product catalog and pricing with you?`;
    let reason = 'New inquiry received — initial discovery needed.';

    if (latestQuote && latestQuote.status === 'SENT') {
      suggestedNextAction = 'Quotation Follow-Up & Negotiation';
      callAgenda = `Review Quotation #${latestQuote.quotationNumber} (₹${latestQuote.grandTotal.toLocaleString('en-IN')}) with client.`;
      recommendedChannel = 'WHATSAPP';
      messageDraft = `Hi ${lead.name}, following up on quotation #${latestQuote.quotationNumber}. Please let us know if any adjustments are needed to proceed.`;
      reason = 'Quotation is awaiting client approval.';
    } else if (lastCall && lastCall.outcome === 'FOLLOWUP_REQUESTED') {
      suggestedNextAction = 'Requested Callback';
      callAgenda = `Address client questions raised in previous discussion. Notes: ${lastCall.notes || 'N/A'}`;
      recommendedChannel = 'CALL';
      messageDraft = `Hi ${lead.name}, as requested, I am connecting regarding your requirement.`;
      reason = 'Client explicitly requested a follow-up call.';
    } else if (lead.status === 'QUALIFIED') {
      suggestedNextAction = 'Technical Site Visit / Video Demo';
      callAgenda = 'Demonstrate machinery features and confirm technical specifications.';
      recommendedChannel = 'VISIT';
      messageDraft = `Hi ${lead.name}, our field technical specialist can visit your site to inspect installation requirements.`;
      reason = 'Lead is qualified with high purchase intent.';
    }

    return {
      aiEnabled,
      suggestedNextAction,
      suggestedFollowUpDate: new Date(Date.now() + 24 * 3600000).toISOString().split('T')[0],
      callAgenda,
      messageDraft,
      recommendedChannel,
      reason
    };
  }

  /**
   * Calculates System-Suggested Lead Priority (HOT, WARM, COLD) without overwriting manual priority
   */
  public static calculateLeadPriority(lead: LeadDoc): {
    systemSuggestedPriority: 'HOT' | 'WARM' | 'COLD';
    score: number;
    reasons: string[];
  } {
    let score = 0;
    const reasons: string[] = [];

    // 1. Estimated Value
    if (lead.estimatedValue >= 500000) {
      score += 40;
      reasons.push('High deal value (>= ₹5,00,000)');
    } else if (lead.estimatedValue >= 100000) {
      score += 25;
      reasons.push('Medium deal value (>= ₹1,00,000)');
    } else {
      score += 10;
    }

    // 2. Stage & Status
    if (lead.status === 'NEGOTIATION' || lead.status === 'PROPOSAL') {
      score += 35;
      reasons.push('Advanced sales stage (Proposal / Negotiation)');
    } else if (lead.status === 'QUALIFIED') {
      score += 20;
      reasons.push('Qualified requirement');
    }

    // 3. Recency & Interaction Activity
    const leadAgeDays = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 3600 * 24);
    if (leadAgeDays <= 3) {
      score += 25;
      reasons.push('Fresh lead received in the last 72 hours');
    } else if (leadAgeDays <= 14) {
      score += 10;
    }

    let systemSuggestedPriority: 'HOT' | 'WARM' | 'COLD' = 'COLD';
    if (score >= 60) {
      systemSuggestedPriority = 'HOT';
    } else if (score >= 35) {
      systemSuggestedPriority = 'WARM';
    }

    return { systemSuggestedPriority, score, reasons };
  }

  /**
   * Spatial Query: Finds Nearby Assigned Work for the Authenticated Employee
   */
  public static findNearbyAssignedWork(params: {
    employeeId: string;
    latitude: number;
    longitude: number;
    maxRadiusKm?: number;
  }): NearbyWorkItem[] {
    const maxRadiusKm = params.maxRadiusKm || 30;
    const results: NearbyWorkItem[] = [];

    // 1. Assigned Pending Tasks with Coordinates
    const tasks = db.tasks.find(t =>
      (t.assignedTo === params.employeeId || t.assignedToId === params.employeeId) &&
      t.status !== 'COMPLETED'
    );

    for (const task of tasks) {
      // Find related customer or lead coordinates
      let targetLat: number | undefined;
      let targetLng: number | undefined;
      let address: string | undefined;
      let contactName: string | undefined;
      let contactPhone: string | undefined;

      if (task.relatedTo && typeof task.relatedTo === 'object' && task.relatedTo.id) {
        const customer = db.customers.findById(task.relatedTo.id);
        if (customer && (customer as any).latitude && (customer as any).longitude) {
          targetLat = (customer as any).latitude;
          targetLng = (customer as any).longitude;
          address = customer.address ? `${customer.address.city}, ${customer.address.state}` : undefined;
          contactName = customer.name;
          contactPhone = customer.phone;
        }
      }

      // Check if task has attached geofence
      if (targetLat === undefined) {
        const taskGeo = db.geofences.findOne(g => g.taskId === task._id);
        if (taskGeo) {
          targetLat = taskGeo.latitude;
          targetLng = taskGeo.longitude;
          address = taskGeo.address;
        }
      }

      if (targetLat !== undefined && targetLng !== undefined) {
        const distMeters = GeodesicService.calculateDistanceMeters(
          params.latitude,
          params.longitude,
          targetLat,
          targetLng
        );
        const distKm = Math.round((distMeters / 1000) * 10) / 10;
        if (distKm <= maxRadiusKm) {
          results.push({
            id: task._id,
            type: 'TASK',
            title: task.title,
            subtitle: task.description || 'Assigned field task',
            priority: task.priority || 'MEDIUM',
            latitude: targetLat,
            longitude: targetLng,
            distanceKm: distKm,
            distanceMeters: Math.round(distMeters),
            address,
            dueTime: task.dueDate,
            contactName,
            contactPhone
          });
        }
      }
    }

    // 2. Assigned Customer Site Locations
    const customers = db.customers.find(c => c.assignedTo === params.employeeId);
    for (const cust of customers) {
      if ((cust as any).latitude && (cust as any).longitude) {
        const distMeters = GeodesicService.calculateDistanceMeters(
          params.latitude,
          params.longitude,
          (cust as any).latitude,
          (cust as any).longitude
        );
        const distKm = Math.round((distMeters / 1000) * 10) / 10;
        if (distKm <= maxRadiusKm) {
          results.push({
            id: cust._id,
            type: 'CUSTOMER_VISIT',
            title: cust.companyName || cust.name,
            subtitle: `Account: ${cust.customerCode || 'Direct'}`,
            priority: 'MEDIUM',
            latitude: (cust as any).latitude,
            longitude: (cust as any).longitude,
            distanceKm: distKm,
            distanceMeters: Math.round(distMeters),
            address: `${cust.address?.city || ''}, ${cust.address?.state || ''}`,
            contactName: cust.name,
            contactPhone: cust.phone
          });
        }
      }
    }

    // Sort by closest proximity
    return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  /**
   * Generates Auto-Drafted Travel Expense Claim from Filtered Route Distance
   */
  public static generateTravelExpenseDraft(params: {
    employeeId: string;
    employeeName: string;
    date: string;
    ratePerKm?: number;
  }): TravelExpenseDraftDoc {
    const ratePerKm = params.ratePerKm || 8.5; // Default standard ₹8.5/km

    // Fetch verified daily tracking summary
    const summaryId = `sum_${params.employeeId}_${params.date}`;
    const summary = db.dailyTrackingSummaries?.findById(summaryId);
    const distanceKm = summary?.totalDistanceKm || 0;
    const calculatedAmount = Math.round(distanceKm * ratePerKm * 100) / 100;

    const existing = db.travelExpenseDrafts.findOne(
      e => e.employeeId === params.employeeId && e.date === params.date
    );

    if (existing) {
      return db.travelExpenseDrafts.updateById(existing._id, {
        distanceKm,
        ratePerKm,
        calculatedAmount,
        totalClaimAmount: calculatedAmount + (existing.manualAdjustment || 0),
        routeStart: summary?.firstLocationAddress || summary?.firstLocationTime,
        routeEnd: summary?.lastLocationAddress || summary?.lastLocationTime,
        updatedAt: new Date().toISOString()
      }) || existing;
    }

    return db.travelExpenseDrafts.insertOne({
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      date: params.date,
      distanceKm,
      ratePerKm,
      calculatedAmount,
      manualAdjustment: 0,
      totalClaimAmount: calculatedAmount,
      notes: `Automated mileage draft for ${distanceKm} km field travel.`,
      routeStart: summary?.firstLocationAddress || summary?.firstLocationTime,
      routeEnd: summary?.lastLocationAddress || summary?.lastLocationTime,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Assembles a Unified Chronological Workday Timeline
   */
  public static getWorkdayTimeline(employeeId: string, date: string): WorkdayTimelineEvent[] {
    const events: WorkdayTimelineEvent[] = [];

    // 1. Attendance Check-In & Check-Out
    const attendance = db.attendance.findOne(a => a.employeeId === employeeId && a.date === date);
    if (attendance) {
      if (attendance.checkIn) {
        events.push({
          id: `att_in_${attendance._id}`,
          type: 'CLOCK_IN',
          title: 'Shift Started (Clock-In)',
          description: `Checked in at ${attendance.checkIn}. Status: ${attendance.status}`,
          timestamp: `${date}T${attendance.checkIn}`,
          location: {
            latitude: attendance.locationCheckIn?.lat,
            longitude: attendance.locationCheckIn?.lng,
            address: attendance.locationCheckIn?.address,
            geofenceName: attendance.locationCheckIn?.matchedLocationName
          }
        });
      }

      // Breaks
      if (attendance.breaks) {
        attendance.breaks.forEach((b, idx) => {
          events.push({
            id: `break_start_${idx}`,
            type: 'BREAK_STARTED',
            title: `Break Started: ${b.reason || 'General'}`,
            description: `Began break at ${b.start}`,
            timestamp: `${date}T${b.start}`
          });
          if (b.end) {
            events.push({
              id: `break_end_${idx}`,
              type: 'BREAK_ENDED',
              title: `Break Ended (${b.durationMinutes || 0} mins)`,
              description: `Resumed work at ${b.end}`,
              timestamp: `${date}T${b.end}`
            });
          }
        });
      }

      if (attendance.checkOut) {
        events.push({
          id: `att_out_${attendance._id}`,
          type: 'CLOCK_OUT',
          title: 'Shift Completed (Clock-Out)',
          description: `Checked out at ${attendance.checkOut}. Total work hours: ${attendance.workHours || 0}h`,
          timestamp: `${date}T${attendance.checkOut}`,
          location: {
            latitude: attendance.locationCheckOut?.lat,
            longitude: attendance.locationCheckOut?.lng,
            address: attendance.locationCheckOut?.address
          }
        });
      }
    }

    // 2. Geofence Events
    const geofenceEvents = db.geofenceEvents?.find(
      g => g.employeeId === employeeId && g.timestamp.startsWith(date)
    ) || [];
    for (const ge of geofenceEvents) {
      events.push({
        id: `geo_${ge._id}`,
        type: ge.eventType === 'ENTER' ? 'GEOFENCE_ENTER' : 'GEOFENCE_EXIT',
        title: ge.eventType === 'ENTER' ? `Arrived at ${ge.geofenceName}` : `Departed from ${ge.geofenceName}`,
        description: ge.durationMinutes ? `Dwell duration: ${ge.durationMinutes} minutes` : 'Geofence transition recorded',
        timestamp: ge.timestamp,
        location: {
          latitude: ge.latitude,
          longitude: ge.longitude,
          geofenceName: ge.geofenceName
        }
      });
    }

    // 3. Client Calls
    const calls = db.callLogs.find(c => c.employeeId === employeeId && c.timestamp.startsWith(date));
    for (const call of calls) {
      events.push({
        id: `call_${call._id}`,
        type: 'CALL',
        title: `Outbound Call: ${call.leadName || call.leadPhone}`,
        description: `Duration: ${call.durationSeconds}s | Outcome: ${call.outcome} | Notes: ${call.notes || 'None'}`,
        timestamp: call.timestamp
      });
    }

    // 4. Visit Proofs
    const proofs = db.fieldVisitProofs.find(p => p.employeeId === employeeId && p.timestamp.startsWith(date));
    for (const proof of proofs) {
      events.push({
        id: `proof_${proof._id}`,
        type: 'PHOTO_PROOF',
        title: `Field Visit Proof Submitted (${proof.verificationStatus})`,
        description: proof.notes || 'Site photo and customer signature captured.',
        timestamp: proof.timestamp,
        location: {
          latitude: proof.latitude,
          longitude: proof.longitude
        }
      });
    }

    // Sort chronologically
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Generates Daily Workday Story with structured metrics & editable human-readable draft
   */
  public static getDailyWorkdayStory(employeeId: string, date: string) {
    const summary = db.dailyTrackingSummaries?.findById(`sum_${employeeId}_${date}`);
    const attendance = db.attendance.findOne(a => a.employeeId === employeeId && a.date === date);

    const callsCount = db.callLogs.countDocuments(c => c.employeeId === employeeId && c.timestamp.startsWith(date));
    const followUpsCount = db.followUps.countDocuments(f => (f.assignedTo === employeeId || f.assignedTo === attendance?.employeeName) && f.status === 'COMPLETED' && (f.completedAt?.startsWith(date) || false));
    const tasksCompleted = db.tasks.countDocuments(t => (t.assignedTo === employeeId || t.assignedToId === employeeId) && t.status === 'COMPLETED' && (t.completedAt?.startsWith(date) || false));
    const quotationsCount = db.quotations.countDocuments(q => q.createdAt.startsWith(date));
    const visitProofsCount = db.fieldVisitProofs.countDocuments(p => p.employeeId === employeeId && p.timestamp.startsWith(date));

    const distanceKm = summary?.totalDistanceKm || 0;
    const workingMinutes = attendance?.workHours ? Math.round(attendance.workHours * 60) : (summary?.totalWorkingMinutes || 0);
    const fieldMinutes = summary?.totalFieldMinutes || 0;
    const officeMinutes = summary?.totalOfficeMinutes || 0;

    const metrics = {
      clientVisits: visitProofsCount,
      calls: callsCount,
      followUps: followUpsCount,
      quotations: quotationsCount,
      tasksCompleted,
      distanceKm,
      workingMinutes,
      fieldMinutes,
      officeMinutes
    };

    const draftText = `Completed ${visitProofsCount} client visits, made ${callsCount} customer calls, completed ${followUpsCount} follow-ups, ${tasksCompleted} tasks, and generated ${quotationsCount} quotations with ~${distanceKm} km field travel across ${Math.round(workingMinutes / 60 * 10) / 10} hours.`;

    return {
      date,
      metrics,
      draftText
    };
  }
}
