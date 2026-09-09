import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import {
  LatestLocation,
  Geofence,
  LocationHistory,
  GeofenceEvent,
  DailyTrackingSummary,
  TrackingPolicy
} from '@/src/types';
import {
  PageHeader,
  StatusBadge,
  Modal,
  exportToCSV
} from '@/src/components/common/UIComponents';
import {
  MapPin,
  Compass,
  Navigation,
  Radio,
  Building2,
  Users,
  Clock,
  Battery,
  BatteryCharging,
  Zap,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Sliders,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
  Maximize2,
  RotateCcw,
  Smartphone,
  Laptop,
  Check,
  ChevronRight,
  TrendingUp,
  Map,
  Table as TableIcon,
  Activity
} from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet Default Icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface EmployeeLiveItem {
  employeeId: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  status: string;
  isFieldEmployee: boolean;
  trackingEnabled: boolean;
  consentStatus: string;
  location: LatestLocation | null;
}

export const LiveTrackingView: React.FC = () => {
  const { hasPermission, user } = useAuth();

  // View States
  const [viewMode, setViewMode] = useState<'MAP' | 'TABLE'>('MAP');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<EmployeeLiveItem[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    trackingActive: 0,
    atOffice: 0,
    inField: 0,
    stopped: 0,
    offline: 0,
    onLeave: 0,
    outsideGeofence: 0
  });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Map settings & Layers
  const [showGeofencesOnMap, setShowGeofencesOnMap] = useState(true);
  const [showFieldOnly, setShowFieldOnly] = useState(false);

  // Employee 360 Detail Drawer
  const [drawerEmployee, setDrawerEmployee] = useState<EmployeeLiveItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'OVERVIEW' | 'ROUTE' | 'GEOFENCE' | 'TIMELINE'>('OVERVIEW');
  const [routeDate, setRouteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [routePoints, setRoutePoints] = useState<LocationHistory[]>([]);
  const [routeStops, setRouteStops] = useState<LocationHistory[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Modals
  const [isGeofenceModalOpen, setIsGeofenceModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [policyConfig, setPolicyConfig] = useState<TrackingPolicy | null>(null);

  // Map DOM & Leaflet References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const geofencesGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeMarkersGroupRef = useRef<L.LayerGroup | null>(null);

  // 1. Fetch Live Tracking Data
  const fetchLiveTrackingData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [liveRes, geoRes, policyRes] = await Promise.all([
        api.get('/employee-tracking/live'),
        api.get('/employee-tracking/geofences'),
        api.get('/employee-tracking/settings')
      ]);

      if (liveRes.success && liveRes.data) {
        setEmployees(liveRes.data.employees || []);
        if (liveRes.data.stats) setStats(liveRes.data.stats);
      }

      if (geoRes.success && geoRes.data) {
        setGeofences(geoRes.data);
      }

      if (policyRes.success && policyRes.data) {
        setPolicyConfig(policyRes.data);
      }
    } catch (err) {
      console.error('Error fetching live tracking data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveTrackingData();

    // Auto-polling interval (30s fallback)
    const timer = setInterval(() => {
      fetchLiveTrackingData();
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (viewMode !== 'MAP' || !mapContainerRef.current) return;

    if (!leafletMapRef.current) {
      // Initialize Leaflet Map centered around India / North Region (Noida/Delhi/Gujarat)
      const map = L.map(mapContainerRef.current, {
        center: [28.6139, 77.2090], // Default Noida HQ
        zoom: 12,
        zoomControl: false
      });

      // Add high-resolution OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      // Add custom positioned zoom controls
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      geofencesGroupRef.current = L.layerGroup().addTo(map);
      routeMarkersGroupRef.current = L.layerGroup().addTo(map);

      leafletMapRef.current = map;
    }

    return () => {
      // Keep map instance alive across filter updates
    };
  }, [viewMode]);

  // 3. Render Geofences on Map
  useEffect(() => {
    if (!leafletMapRef.current || !geofencesGroupRef.current) return;

    geofencesGroupRef.current.clearLayers();

    if (showGeofencesOnMap) {
      geofences.forEach(geo => {
        if (!geo.enabled) return;

        let color = '#3b82f6'; // Office Blue
        if (geo.category === 'WAREHOUSE') color = '#6366f1';
        if (geo.category === 'CLIENT_SITE') color = '#f59e0b';
        if (geo.category === 'PROJECT_SITE') color = '#10b981';

        const circle = L.circle([geo.latitude, geo.longitude], {
          radius: geo.radiusMeters,
          color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.15,
          dashArray: geo.category === 'CLIENT_SITE' ? '4, 6' : undefined
        });

        circle.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
            <div style="font-weight: bold; color: #1e293b; margin-bottom: 2px;">${geo.name}</div>
            <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">${geo.code} &bull; ${geo.category}</div>
            <div style="color: #475569; font-size: 10px;">Radius: ${geo.radiusMeters}m</div>
            ${geo.address ? `<div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${geo.address}</div>` : ''}
          </div>
        `);

        circle.addTo(geofencesGroupRef.current!);
      });
    }
  }, [geofences, showGeofencesOnMap]);

  // 4. Render Employee Markers on Map
  useEffect(() => {
    if (!leafletMapRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();

    const filtered = employees.filter(emp => {
      if (showFieldOnly && !emp.isFieldEmployee) return false;
      if (filterDept !== 'ALL' && emp.department !== filterDept) return false;
      if (filterStatus !== 'ALL') {
        const s = emp.location?.trackingStatus || 'OFFLINE';
        if (s !== filterStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          emp.name.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q) ||
          emp.department.toLowerCase().includes(q) ||
          (emp.phone && emp.phone.includes(q));
        if (!match) return false;
      }
      return true;
    });

    filtered.forEach(emp => {
      if (!emp.location || typeof emp.location.latitude !== 'number') return;

      const loc = emp.location;
      const isSelected = selectedEmployeeId === emp.employeeId;

      // Status styling
      let ringColor = 'border-emerald-500 bg-emerald-50 text-emerald-700';
      let pulseColor = 'bg-emerald-400';
      if (loc.trackingStatus === 'TRAVELLING') {
        ringColor = 'border-sky-500 bg-sky-50 text-sky-700';
        pulseColor = 'bg-sky-400';
      } else if (loc.trackingStatus === 'STOPPED') {
        ringColor = 'border-amber-500 bg-amber-50 text-amber-700';
        pulseColor = 'bg-amber-400';
      } else if (loc.trackingStatus === 'STALE' || loc.trackingStatus === 'OFFLINE') {
        ringColor = 'border-slate-300 bg-slate-100 text-slate-500';
        pulseColor = 'bg-slate-300';
      } else if (emp.status === 'ON_LEAVE') {
        ringColor = 'border-purple-400 bg-purple-50 text-purple-700';
        pulseColor = 'bg-purple-300';
      }

      const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${loc.trackingStatus === 'TRAVELLING' || loc.trackingStatus === 'ONLINE' ? `
              <span style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; opacity: 0.5;" class="${pulseColor} animate-ping"></span>
            ` : ''}
            <div style="width: 32px; height: 32px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border-width: 2.5px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);" class="${ringColor} ${isSelected ? 'ring-4 ring-blue-400 ring-offset-1' : ''}">
              ${initials}
            </div>
            <div style="position: absolute; bottom: -18px; white-space: nowrap; background: rgba(15, 23, 42, 0.85); color: white; font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 4px; pointer-events: none; backdrop-filter: blur(4px);">
              ${emp.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

      const lastUpdatedSec = Math.round((Date.now() - new Date(loc.lastRecordedAt).getTime()) / 1000);
      const lastSeenText = lastUpdatedSec < 60 ? `${lastUpdatedSec}s ago` : `${Math.round(lastUpdatedSec / 60)}m ago`;

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; font-size: 13px; color: #0f172a;">${emp.name}</span>
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #e2e8f0; color: #475569;">${emp.employeeCode}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${emp.designation} &bull; ${emp.department}</div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; background: #f8fafc; padding: 6px; border-radius: 6px; margin-bottom: 8px;">
            <div><strong>Status:</strong> ${loc.trackingStatus}</div>
            <div><strong>Speed:</strong> ${loc.speedKmh || 0} km/h</div>
            <div><strong>Accuracy:</strong> &plusmn;${loc.accuracy}m</div>
            <div><strong>Battery:</strong> ${loc.batteryLevel !== undefined ? `${loc.batteryLevel}%` : 'N/A'}</div>
          </div>

          ${loc.currentGeofenceName ? `
            <div style="font-size: 10px; color: #0284c7; margin-bottom: 6px; font-weight: 600;">
              📍 Inside ${loc.currentGeofenceName}
            </div>
          ` : ''}

          <div style="font-size: 9px; color: #94a3b8; margin-bottom: 8px;">
            Updated ${lastSeenText} &bull; Today: ${loc.distanceTodayKm || 0} km
          </div>

          <button id="btn-inspect-${emp.employeeId}" style="width: 100%; padding: 6px 0; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
            View 360 Tracking Profile
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${emp.employeeId}`);
        if (btn) {
          btn.onclick = () => openEmployeeDrawer(emp);
        }
      });

      marker.addTo(markersGroupRef.current!);
    });
  }, [employees, filterDept, filterStatus, searchQuery, showFieldOnly, selectedEmployeeId]);

  // Focus single employee on Map
  const focusEmployeeOnMap = (emp: EmployeeLiveItem) => {
    setSelectedEmployeeId(emp.employeeId);
    if (leafletMapRef.current && emp.location && typeof emp.location.latitude === 'number') {
      leafletMapRef.current.flyTo([emp.location.latitude, emp.location.longitude], 15, {
        duration: 1.2
      });
    }
  };

  // Recenter Map to fit all active markers
  const recenterMap = () => {
    if (!leafletMapRef.current) return;
    const activeCoords: [number, number][] = employees
      .filter(e => e.location && typeof e.location.latitude === 'number')
      .map(e => [e.location!.latitude, e.location!.longitude]);

    if (activeCoords.length > 0) {
      const bounds = L.latLngBounds(activeCoords);
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
    } else {
      leafletMapRef.current.setView([28.6139, 77.2090], 12);
    }
  };

  // 5. Open Employee 360 Drawer
  const openEmployeeDrawer = async (emp: EmployeeLiveItem) => {
    setDrawerEmployee(emp);
    setDrawerTab('OVERVIEW');
    setDrawerLoading(true);
    focusEmployeeOnMap(emp);

    try {
      const [routeRes, timelineRes] = await Promise.all([
        api.get(`/employee-tracking/employee/${emp.employeeId}/route?date=${routeDate}`),
        api.get(`/employee-tracking/employee/${emp.employeeId}/timeline?date=${routeDate}`)
      ]);

      if (routeRes.success && routeRes.data) {
        setRoutePoints(routeRes.data.points || []);
        setRouteStops(routeRes.data.stops || []);
      }

      if (timelineRes.success && timelineRes.data) {
        setTimelineEvents(timelineRes.data);
      }
    } catch (err) {
      console.error('Error fetching employee detailed tracking:', err);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Render Route Polyline on Map when viewing Route History Tab
  useEffect(() => {
    if (!leafletMapRef.current || !routeMarkersGroupRef.current) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    routeMarkersGroupRef.current.clearLayers();

    if (drawerEmployee && drawerTab === 'ROUTE' && routePoints.length > 1) {
      const latlngs: [number, number][] = routePoints.map(p => [p.latitude, p.longitude]);

      const polyline = L.polyline(latlngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
      }).addTo(leafletMapRef.current);

      routePolylineRef.current = polyline;

      // Add Start Marker (Green)
      const startPoint = routePoints[0];
      L.circleMarker([startPoint.latitude, startPoint.longitude], {
        radius: 7,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 1
      }).bindPopup(`<b>Start Location</b><br/>${new Date(startPoint.recordedAt).toLocaleTimeString()}`).addTo(routeMarkersGroupRef.current);

      // Add Stop Markers (Amber)
      routeStops.forEach((stop, idx) => {
        L.circleMarker([stop.latitude, stop.longitude], {
          radius: 8,
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.9
        }).bindPopup(`<b>Stop #${idx + 1} (${stop.stopDurationMinutes || 10} min)</b><br/>${stop.address || ''}`).addTo(routeMarkersGroupRef.current!);
      });

      // Fit route bounds
      leafletMapRef.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    }
  }, [drawerEmployee, drawerTab, routePoints, routeStops]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* 1. Header with View Toggle & Action Buttons */}
      <PageHeader
        title="Employee Live Tracking & Geofencing"
        subtitle="Real-time field & office workforce GPS telemetry, site geofences & route intelligence"
        actionText="Manage Geofences"
        actionIcon={MapPin}
        actionPermission="employee_tracking.manage_geofence"
        onAction={() => setIsGeofenceModalOpen(true)}
        secondaryAction={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLiveTrackingData(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsPolicyModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Tracking Policy
            </button>
            <button
              onClick={() => exportToCSV('360CRM_Tracking_Summary', employees.map(e => ({
                EmployeeCode: e.employeeCode,
                Name: e.name,
                Department: e.department,
                Designation: e.designation,
                Status: e.location?.trackingStatus || 'OFFLINE',
                WorkLocation: e.location?.workLocationType || 'OFFICE',
                CurrentGeofence: e.location?.currentGeofenceName || 'N/A',
                DistanceTodayKm: e.location?.distanceTodayKm || 0,
                BatteryLevel: e.location?.batteryLevel || 'N/A',
                LastSeen: e.location?.lastRecordedAt || 'N/A'
              })))}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('MAP')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === 'MAP' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === 'TABLE' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>
        }
      />

      {/* 2. Top Statistics KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Total Staff</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-800">{stats.totalEmployees}</div>
          <div className="text-[10px] text-slate-400 mt-1">Company Workforce</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-semibold">Live Tracking</span>
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{stats.trackingActive}</div>
          <div className="text-[10px] text-emerald-500/80 mt-1">Active GPS Handshake</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-semibold">At Office</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-blue-600">{stats.atOffice}</div>
          <div className="text-[10px] text-blue-500/80 mt-1">Inside HQ / Warehouse</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-600 mb-1">
            <span className="text-[11px] font-semibold">In Field</span>
            <Navigation className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-bold text-sky-600">{stats.inField}</div>
          <div className="text-[10px] text-sky-500/80 mt-1">Client Visits & Transit</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-[11px] font-semibold">Stopped</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600">{stats.stopped}</div>
          <div className="text-[10px] text-amber-500/80 mt-1">&ge; 10 min Stationary</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold">Offline</span>
            <XCircle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-600">{stats.offline}</div>
          <div className="text-[10px] text-slate-400 mt-1">Shift Ended / Inactive</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 mb-1">
            <span className="text-[11px] font-semibold">On Leave</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-bold text-purple-600">{stats.onLeave}</div>
          <div className="text-[10px] text-purple-500/80 mt-1">Approved Time Off</div>
        </div>
      </div>

      {/* 3. Main Workspace Layout */}
      {viewMode === 'MAP' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-270px)] min-h-[580px]">
          {/* Left Panel: Searchable Employee Roster */}
          <div className="lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Search & Filters Header */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff by name, ID, phone..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                <select
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">All Depts</option>
                  <option value="Sales">Sales</option>
                  <option value="Store">Store / Warehouse</option>
                  <option value="Accounts">Accounts</option>
                  <option value="HR">HR</option>
                  <option value="Technical">Technical</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ONLINE">Online / Office</option>
                  <option value="TRAVELLING">In Field / Moving</option>
                  <option value="STOPPED">Stopped</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="STALE">Stale</option>
                </select>

                <button
                  onClick={() => setShowFieldOnly(prev => !prev)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition ${
                    showFieldOnly
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Field Reps
                </button>
              </div>
            </div>

            {/* Employee Scrollable List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
              {employees.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No employee live records found.
                </div>
              ) : (
                employees
                  .filter(emp => {
                    if (showFieldOnly && !emp.isFieldEmployee) return false;
                    if (filterDept !== 'ALL' && emp.department !== filterDept) return false;
                    if (filterStatus !== 'ALL') {
                      const s = emp.location?.trackingStatus || 'OFFLINE';
                      if (s !== filterStatus) return false;
                    }
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      const match =
                        emp.name.toLowerCase().includes(q) ||
                        emp.employeeCode.toLowerCase().includes(q) ||
                        emp.department.toLowerCase().includes(q) ||
                        (emp.phone && emp.phone.includes(q));
                      if (!match) return false;
                    }
                    return true;
                  })
                  .map(emp => {
                    const loc = emp.location;
                    const isSelected = selectedEmployeeId === emp.employeeId;

                    return (
                      <div
                        key={emp.employeeId}
                        onClick={() => focusEmployeeOnMap(emp)}
                        className={`p-3 rounded-xl cursor-pointer transition flex items-start justify-between border ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                            : 'hover:bg-slate-50/80 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Initials avatar badge */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            loc?.trackingStatus === 'TRAVELLING' ? 'bg-sky-100 text-sky-700 border border-sky-300' :
                            loc?.trackingStatus === 'STOPPED' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                            loc?.trackingStatus === 'ONLINE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                            'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-slate-800 truncate">{emp.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({emp.employeeCode})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">{emp.designation} &bull; {emp.department}</div>

                            {/* Location & telemetry row */}
                            {loc ? (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded-md font-semibold ${
                                  loc.trackingStatus === 'TRAVELLING' ? 'bg-sky-100 text-sky-700' :
                                  loc.trackingStatus === 'STOPPED' ? 'bg-amber-100 text-amber-700' :
                                  loc.trackingStatus === 'ONLINE' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  ● {loc.trackingStatus}
                                </span>

                                {loc.currentGeofenceName && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md truncate max-w-[130px]">
                                    📍 {loc.currentGeofenceName}
                                  </span>
                                )}

                                <span className="text-slate-400">
                                  {loc.distanceTodayKm || 0} km
                                </span>

                                {loc.batteryLevel !== undefined && (
                                  <span className="flex items-center gap-0.5 text-slate-500">
                                    <Battery className="w-3 h-3 text-slate-400" />
                                    {loc.batteryLevel}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1 text-[10px] text-slate-400">
                                No recent GPS broadcast
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeDrawer(emp);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition"
                          title="Open 360 Profile"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Right Panel: Leaflet Interactive Map */}
          <div className="lg:col-span-8 relative bg-slate-100 rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            {/* Map Floating Toolbar */}
            <div className="absolute top-3 left-3 z-1000 flex items-center gap-2 bg-white/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-sm">
              <button
                onClick={() => setShowGeofencesOnMap(prev => !prev)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                  showGeofencesOnMap ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Geofences ({geofences.length})
              </button>

              <button
                onClick={recenterMap}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition flex items-center gap-1.5"
                title="Fit all markers"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                Fit View
              </button>
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full min-h-[500px]" />
          </div>
        </div>
      ) : (
        /* 4. Table View Mode */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department & Role</th>
                  <th className="px-5 py-3.5">Tracking Status</th>
                  <th className="px-5 py-3.5">Work Location</th>
                  <th className="px-5 py-3.5">Current Site / Geofence</th>
                  <th className="px-5 py-3.5">Distance Today</th>
                  <th className="px-5 py-3.5">Battery</th>
                  <th className="px-5 py-3.5">Last Seen</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {employees.map(emp => {
                  const loc = emp.location;
                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        <div>{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>{emp.department}</div>
                        <div className="text-[10px] text-slate-400">{emp.designation}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {loc ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            loc.trackingStatus === 'TRAVELLING' ? 'bg-sky-100 text-sky-700' :
                            loc.trackingStatus === 'STOPPED' ? 'bg-amber-100 text-amber-700' :
                            loc.trackingStatus === 'ONLINE' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            ● {loc.trackingStatus}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Offline</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-slate-700">{loc?.workLocationType || 'OFFICE'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {loc?.currentGeofenceName ? (
                          <span className="text-blue-600 font-medium">📍 {loc.currentGeofenceName}</span>
                        ) : (
                          <span className="text-slate-400">External Location</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {loc?.distanceTodayKm || 0} km
                      </td>
                      <td className="px-5 py-3.5">
                        {loc?.batteryLevel !== undefined ? (
                          <span className="flex items-center gap-1">
                            <Battery className="w-3.5 h-3.5 text-slate-400" />
                            {loc.batteryLevel}%
                          </span>
                        ) : 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {loc?.lastRecordedAt ? new Date(loc.lastRecordedAt).toLocaleTimeString() : 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setViewMode('MAP');
                            openEmployeeDrawer(emp);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          View 360
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Employee 360 Location & Route Drawer Modal */}
      {drawerEmployee && (
        <Modal
          isOpen={Boolean(drawerEmployee)}
          onClose={() => setDrawerEmployee(null)}
          title={`Employee 360 Tracking: ${drawerEmployee.name}`}
        >
          <div className="space-y-4">
            {/* Drawer Tabs */}
            <div className="flex items-center border-b border-slate-200">
              <button
                onClick={() => setDrawerTab('OVERVIEW')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                  drawerTab === 'OVERVIEW' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Live Overview
              </button>
              <button
                onClick={() => setDrawerTab('ROUTE')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                  drawerTab === 'ROUTE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Route Polyline ({routePoints.length} pts)
              </button>
              <button
                onClick={() => setDrawerTab('TIMELINE')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                  drawerTab === 'TIMELINE' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Activity Timeline ({timelineEvents.length})
              </button>
            </div>

            {drawerLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mb-2" />
                Loading employee telemetry history...
              </div>
            ) : (
              <>
                {drawerTab === 'OVERVIEW' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Live Status</span>
                        <span className="font-bold text-slate-800">{drawerEmployee.location?.trackingStatus || 'OFFLINE'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Today's Distance</span>
                        <span className="font-bold text-blue-600">{drawerEmployee.location?.distanceTodayKm || 0} km</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">GPS Accuracy</span>
                        <span className="font-bold text-slate-800">&plusmn;{drawerEmployee.location?.accuracy || 15} meters</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Battery Status</span>
                        <span className="font-bold text-slate-800">{drawerEmployee.location?.batteryLevel !== undefined ? `${drawerEmployee.location.batteryLevel}%` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="space-y-2 border border-slate-200/80 p-3 rounded-xl bg-white">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Geofence Containment</span>
                        {drawerEmployee.location?.isInsideGeofence ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded-md text-[10px]">
                            Inside {drawerEmployee.location.currentGeofenceName}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded-md text-[10px]">
                            External Field / Transit
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Distance to Primary Office: {((drawerEmployee.location?.distanceFromOfficeMeters || 0) / 1000).toFixed(2)} km
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                      <div><strong>Device Platform:</strong> {drawerEmployee.location?.platform || 'Standard Web Geolocation Client'}</div>
                      <div><strong>Consent State:</strong> {drawerEmployee.consentStatus}</div>
                      <div><strong>Tracking Mode:</strong> {drawerEmployee.isFieldEmployee ? 'Field Travel Mode' : 'Shift Working Hours'}</div>
                    </div>
                  </div>
                )}

                {drawerTab === 'ROUTE' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl text-xs">
                      <span className="font-semibold text-slate-700">Recorded GPS Breadcrumbs</span>
                      <input
                        type="date"
                        value={routeDate}
                        onChange={e => {
                          setRouteDate(e.target.value);
                          openEmployeeDrawer(drawerEmployee);
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                      {routePoints.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">No route breadcrumbs for selected date.</div>
                      ) : (
                        routePoints.map((pt, idx) => (
                          <div key={pt._id || idx} className="py-2 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                                {idx + 1}
                              </span>
                              <div>
                                <span className="font-medium text-slate-800">{pt.address || `(${pt.latitude.toFixed(4)}, ${pt.longitude.toFixed(4)})`}</span>
                                {pt.isStop && <span className="ml-2 px-1.5 py-0.2 bg-amber-100 text-amber-800 font-semibold rounded text-[9px]">Stop: {pt.stopDurationMinutes}m</span>}
                              </div>
                            </div>
                            <span className="text-slate-400 font-mono text-[10px]">{new Date(pt.recordedAt).toLocaleTimeString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {drawerTab === 'TIMELINE' && (
                  <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
                    {timelineEvents.length === 0 ? (
                      <div className="py-8 text-center text-slate-400">No timeline events recorded today.</div>
                    ) : (
                      timelineEvents.map((evt, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800 text-[11px]">{evt.title}</span>
                              <span className="text-slate-400 text-[10px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{evt.description}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* 6. Geofence Site Manager Modal */}
      {isGeofenceModalOpen && (
        <Modal
          isOpen={isGeofenceModalOpen}
          onClose={() => setIsGeofenceModalOpen(false)}
          title="Company Geofences & Site Perimeters"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Configure virtual boundaries for offices, warehouses and client project sites.</span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {geofences.map(geo => (
                <div key={geo._id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-800">{geo.name}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">{geo.code}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{geo.category}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Radius: {geo.radiusMeters}m &bull; Coords: ({geo.latitude.toFixed(4)}, {geo.longitude.toFixed(4)})
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    geo.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {geo.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Tracking Policy Settings Modal */}
      {isPolicyModalOpen && policyConfig && (
        <Modal
          isOpen={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          title="Workforce Tracking & Privacy Configuration"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Anti-Surveillance Privacy Guarantee
              </div>
              <p className="text-[11px] text-blue-700">
                Location tracking only activates during authorized company work shifts and active check-ins. Coordinates received outside working hours are never stored.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Global Tracking Mode</label>
                <select
                  value={policyConfig.trackingMode}
                  onChange={e => setPolicyConfig({ ...policyConfig, trackingMode: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                >
                  <option value="WORKING_HOURS">Working Hours (09:30 AM - 06:30 PM)</option>
                  <option value="ACTIVE_SHIFT">Active Shift (While Clocked In)</option>
                  <option value="FIELD_ONLY">Field Staff Only (Sales & Technicians)</option>
                  <option value="ATTENDANCE_ONLY">Attendance Snapshots Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Moving Update Frequency</label>
                  <select
                    value={policyConfig.updateFrequencySeconds}
                    onChange={e => setPolicyConfig({ ...policyConfig, updateFrequencySeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value={30}>Every 30 seconds</option>
                    <option value={60}>Every 1 minute (Recommended)</option>
                    <option value={120}>Every 2 minutes</option>
                    <option value={300}>Every 5 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Stationary Stop Frequency</label>
                  <select
                    value={policyConfig.stationaryFrequencySeconds}
                    onChange={e => setPolicyConfig({ ...policyConfig, stationaryFrequencySeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    <option value={180}>Every 3 minutes</option>
                    <option value={300}>Every 5 minutes</option>
                    <option value={600}>Every 10 minutes</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-semibold text-slate-800">Require Explicit Employee Consent</div>
                  <div className="text-[10px] text-slate-500">Show consent opt-in dialog before tracking</div>
                </div>
                <input
                  type="checkbox"
                  checked={policyConfig.requireEmployeeConsent}
                  onChange={e => setPolicyConfig({ ...policyConfig, requireEmployeeConsent: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await api.put('/employee-tracking/settings', policyConfig);
                  setIsPolicyModalOpen(false);
                  fetchLiveTrackingData();
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700"
              >
                Save Policy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
