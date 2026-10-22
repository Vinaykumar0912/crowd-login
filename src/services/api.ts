const API_BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000/ws/live';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const apiService = {
  // Authentication
  login: async (credentials: { email: string; password: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return await res.json();
  },
  register: async (userData: { name: string; email: string; password: string; confirm_password?: string }) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    return await res.json();
  },
  getMe: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) return null;
    return await res.json();
  },
  getOnboardingStatus: async (eventId?: string) => {
    const url = eventId 
      ? `${API_BASE_URL}/auth/onboarding-status?event_id=${encodeURIComponent(eventId)}` 
      : `${API_BASE_URL}/auth/onboarding-status`;
    const res = await fetch(url, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to verify onboarding status' }));
      throw new Error(err.detail || 'Failed to verify onboarding status');
    }
    return await res.json();
  },

  // Cameras
  getCameras: async (eventId?: string) => {
    const url = eventId ? `${API_BASE_URL}/cameras?event_id=${eventId}` : `${API_BASE_URL}/cameras`;
    const res = await fetch(url);
    return await res.json();
  },
  addCamera: async (camera: { name: string; rtspUrl: string; location: string; capacity?: number; resolution?: string; fps?: number; zone_id?: string; event_id?: string }) => {
    const res = await fetch(`${API_BASE_URL}/cameras`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: camera.name,
        rtsp_url: camera.rtspUrl,
        location: camera.location,
        capacity: camera.capacity || 200,
        resolution: camera.resolution || '1920x1080',
        fps: camera.fps || 30,
        zone_id: camera.zone_id,
        event_id: camera.event_id
      })
    });
    return await res.json();
  },
  addWebcamCamera: async (data?: { name?: string; location?: string; capacity?: number; zone_id?: string; event_id?: string }) => {
    const formData = new FormData();
    if (data?.name) formData.append('name', data.name);
    if (data?.location) formData.append('location', data.location);
    if (data?.capacity) formData.append('capacity', data.capacity.toString());
    if (data?.zone_id) formData.append('zone_id', data.zone_id);
    if (data?.event_id) formData.append('event_id', data.event_id);

    const res = await fetch(`${API_BASE_URL}/cameras/webcam`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },
  uploadVideoCamera: async (file: File, name?: string, location?: string, capacity?: number, zone_id?: string, event_id?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (location) formData.append('location', location);
    if (capacity) formData.append('capacity', capacity.toString());
    if (zone_id) formData.append('zone_id', zone_id);
    if (event_id) formData.append('event_id', event_id);

    const res = await fetch(`${API_BASE_URL}/cameras/upload-video`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },
  analyzeCamera: async (camId: string) => {
    const res = await fetch(`${API_BASE_URL}/cameras/${camId}/analyze`, { method: 'POST' });
    return await res.json();
  },
  controlCameraPlayback: async (camId: string, action: 'analyze' | 'play' | 'pause' | 'stop' | 'restart' | 'start_analysis' | 'stop_analysis') => {
    const res = await fetch(`${API_BASE_URL}/cameras/${camId}/playback?action=${action}`, { method: 'PUT' });
    return await res.json();
  },
  updateCamera: async (camId: string, camera: Partial<{ name: string; rtspUrl: string; location: string; capacity: number; resolution: string; fps: number; status: string; enabled: boolean; zone_id: string; event_id: string }>) => {
    const payload: any = {};
    if (camera.name !== undefined) payload.name = camera.name;
    if (camera.rtspUrl !== undefined) payload.rtsp_url = camera.rtspUrl;
    if (camera.location !== undefined) payload.location = camera.location;
    if (camera.capacity !== undefined) payload.capacity = camera.capacity;
    if (camera.resolution !== undefined) payload.resolution = camera.resolution;
    if (camera.fps !== undefined) payload.fps = camera.fps;
    if (camera.status !== undefined) payload.status = camera.status;
    if (camera.enabled !== undefined) payload.enabled = camera.enabled;
    if (camera.zone_id !== undefined) payload.zone_id = camera.zone_id;
    if (camera.event_id !== undefined) payload.event_id = camera.event_id;

    const res = await fetch(`${API_BASE_URL}/cameras/${camId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  },
  toggleCameraEnabled: async (camId: string) => {
    const res = await fetch(`${API_BASE_URL}/cameras/${camId}/toggle-enabled`, { method: 'PUT' });
    return await res.json();
  },
  toggleCameraStatus: async (camId: string) => {
    const res = await fetch(`${API_BASE_URL}/cameras/${camId}/toggle-status`, { method: 'PUT' });
    return await res.json();
  },
  deleteCamera: async (camId: string) => {
    const res = await fetch(`${API_BASE_URL}/cameras/${camId}`, { method: 'DELETE' });
    return await res.json();
  },

  // Live Status & Analytics
  getLiveStatus: async (eventId?: string) => {
    const url = eventId ? `${API_BASE_URL}/live-status?event_id=${eventId}` : `${API_BASE_URL}/live-status`;
    const res = await fetch(url);
    return await res.json();
  },
  getCrowdAnalysis: async (camId?: string, eventId?: string) => {
    const params = new URLSearchParams();
    if (camId) params.append('camera_id', camId);
    if (eventId) params.append('event_id', eventId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/crowd-analysis${query}`);
    return await res.json();
  },

  // Alerts
  getAlerts: async (camId?: string, eventId?: string) => {
    const params = new URLSearchParams();
    if (camId) params.append('camera_id', camId);
    if (eventId) params.append('event_id', eventId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/alerts${query}`);
    return await res.json();
  },
  addAlert: async (alert: { title: string; description: string; level: string; zone: string; camera: string }) => {
    const res = await fetch(`${API_BASE_URL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert)
    });
    return await res.json();
  },
  resolveAlert: async (alertId: string) => {
    const res = await fetch(`${API_BASE_URL}/alerts/${alertId}/resolve`, { method: 'PUT' });
    return await res.json();
  },

  // Recommendations & FCA
  getRecommendations: async (camId?: string, eventId?: string) => {
    const params = new URLSearchParams();
    if (camId) params.append('camera_id', camId);
    if (eventId) params.append('event_id', eventId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/recommendations${query}`);
    return await res.json();
  },
  approveRecommendation: async (recId: string) => {
    const res = await fetch(`${API_BASE_URL}/recommendations/${recId}/approve`, { method: 'POST' });
    return await res.json();
  },
  rejectRecommendation: async (recId: string, reason?: string) => {
    const res = await fetch(`${API_BASE_URL}/recommendations/${recId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return await res.json();
  },
  dismissRecommendation: async (recId: string) => {
    const res = await fetch(`${API_BASE_URL}/recommendations/${recId}/dismiss`, { method: 'POST' });
    return await res.json();
  },

  // Events
  getEvents: async () => {
    const res = await fetch(`${API_BASE_URL}/events`, {
      headers: { ...getAuthHeaders() }
    });
    return await res.json();
  },
  getMyEvent: async () => {
    const res = await fetch(`${API_BASE_URL}/events/my-event`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) return null;
    return await res.json();
  },
  addEvent: async (evt: { title: string; venue_name?: string; capacity: number; staff?: number; risk?: string; start_time?: string; end_time?: string; limits?: number; map_url?: string; manager_id?: number }) => {
    const res = await fetch(`${API_BASE_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(evt)
    });
    return await res.json();
  },
  updateEvent: async (evtId: string, evt: Partial<{ title: string; venue_name: string; capacity: number; staff: number; risk: string; start_time: string; end_time: string; limits: number; map_url: string; manager_id: number }>) => {
    const res = await fetch(`${API_BASE_URL}/events/${evtId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(evt)
    });
    return await res.json();
  },
  deleteEvent: async (evtId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${evtId}`, { 
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    return await res.json();
  },

  // Zones & Sub-areas
  getZones: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/zones`);
    return await res.json();
  },
  addZone: async (eventId: string, zone: { name: string; code?: string; capacity?: number; zone_type?: string; coordinates?: string }) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/zones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zone)
    });
    return await res.json();
  },
  updateZone: async (eventId: string, zoneId: string, zone: Partial<{ name: string; code: string; capacity: number; zone_type: string; coordinates: string }>) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/zones/${zoneId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(zone)
    });
    return await res.json();
  },
  deleteZone: async (eventId: string, zoneId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/zones/${zoneId}`, { method: 'DELETE' });
    return await res.json();
  },

  // Emergency Management
  getEmergencyStatus: async (eventId?: string) => {
    const url = eventId ? `${API_BASE_URL}/emergency/status?event_id=${eventId}` : `${API_BASE_URL}/emergency/status`;
    const res = await fetch(url);
    return await res.json();
  },
  getEmergencyEvents: async (eventId?: string) => {
    const url = eventId ? `${API_BASE_URL}/emergency/events?event_id=${eventId}` : `${API_BASE_URL}/emergency/events`;
    const res = await fetch(url);
    return await res.json();
  },
  triggerEmergency: async (emg: { type: string; location: string; description: string }) => {
    const res = await fetch(`${API_BASE_URL}/emergency/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emg)
    });
    return await res.json();
  },
  updateEmergencyEventStatus: async (eventId: string, action: string) => {
    const res = await fetch(`${API_BASE_URL}/emergency/events/${eventId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    return await res.json();
  },
  approveEmergencyDispatch: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/emergency/events/${eventId}/approve-dispatch`, {
      method: 'POST'
    });
    return await res.json();
  },
  resolveEmergency: async () => {
    const res = await fetch(`${API_BASE_URL}/emergency/resolve`, { method: 'PUT' });
    return await res.json();
  },
  updateEmergencyServices: async (services: { police?: string; medical?: string; fire?: string }) => {
    const query = new URLSearchParams(services as any).toString();
    const res = await fetch(`${API_BASE_URL}/emergency/services?${query}`, { method: 'PUT' });
    return await res.json();
  },

  // Security Staff & Dispatch Instructions
  getStaff: async () => {
    const res = await fetch(`${API_BASE_URL}/staff`);
    return await res.json();
  },
  getInstructions: async () => {
    const res = await fetch(`${API_BASE_URL}/staff/instructions`);
    return await res.json();
  },
  sendInstruction: async (instruction: { recipient: string; type?: string; priority?: string; text: string }) => {
    const res = await fetch(`${API_BASE_URL}/staff/instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(instruction)
    });
    return await res.json();
  },

  // System Settings
  getSettings: async () => {
    const res = await fetch(`${API_BASE_URL}/settings`);
    return await res.json();
  },
  updateSettings: async (settings: Partial<{ ai_sensitivity: number; crowd_threshold: number; sound_alerts: boolean; auto_escalation: boolean; fca_auto_recommendation: boolean; language: string; theme: string }>) => {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await res.json();
  },

  // Venue Architecture Map & Pins
  getVenueDetails: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/venue`);
    return await res.json();
  },
  uploadVenueMap: async (eventId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/venue-map`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },
  deleteVenueMap: async (eventId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/venue-map`, { method: 'DELETE' });
    return await res.json();
  },
  addVenuePin: async (eventId: string, pin: { pin_type: string; label: string; x: number; y: number }) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/pins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pin)
    });
    return await res.json();
  },
  deleteVenuePin: async (eventId: string, pinId: string) => {
    const res = await fetch(`${API_BASE_URL}/events/${eventId}/pins/${pinId}`, { method: 'DELETE' });
    return await res.json();
  },

  // Reports Summary
  getReports: async (eventId?: string) => {
    const url = eventId ? `${API_BASE_URL}/reports?event_id=${eventId}` : `${API_BASE_URL}/reports`;
    const res = await fetch(url);
    return await res.json();
  },

  // Download PDF Audit Report
  downloadPDFReport: (options?: { camId?: string; eventId?: string; includeCams?: boolean; includeAlerts?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.camId) params.append('cam_id', options.camId);
    if (options?.eventId) params.append('event_id', options.eventId);
    if (options?.includeCams !== undefined) params.append('include_cams', options.includeCams.toString());
    if (options?.includeAlerts !== undefined) params.append('include_alerts', options.includeAlerts.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    const url = `${API_BASE_URL}/reports/pdf${query}`;
    window.open(url, '_blank');
  }
};

export class LiveWebSocketClient {
  private ws: WebSocket | null = null;
  private onMessageCallback: (data: any) => void;
  private reconnectTimer: any = null;

  constructor(onMessage: (data: any) => void) {
    this.onMessageCallback = onMessage;
  }

  public connect() {
    try {
      this.ws = new WebSocket(WS_BASE_URL);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to backend live stream server: ws://localhost:8000/ws/live');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessageCallback(data);
        } catch (e) {
          console.error('[WebSocket] Error parsing message payload', e);
        }
      };

      this.ws.onerror = () => {};

      this.ws.onclose = () => {
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 3000);
      };
    } catch (e) {
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, 3000);
    }
  }

  public disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
