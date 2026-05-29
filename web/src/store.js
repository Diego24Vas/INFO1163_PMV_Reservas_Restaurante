import { reactive } from 'vue'

export const store = reactive({
  role: null, // 'admin', 'waiter', null
  rooms: [],
  activeRoomId: null,
  activeTable: null,
  tableCounter: 1,
  elementCounter: 1,
  
  waiters: [],
  activeWaiterId: null,

  history: [],
  
  // Flag to know if it's already loaded
  isLoaded: false,
  isStaffLoaded: false,
  isHistoryLoaded: false,

  async loadHistory() {
    if (this.isHistoryLoaded) return;
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        this.history = data.history || [];
        this.isHistoryLoaded = true;
      }
    } catch (e) {
      console.error('Failed to load history from mock API', e);
    }
  },

  async saveHistory() {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: this.history })
      });
    } catch (e) {
      console.error('Failed to save history to mock API', e);
    }
  },

  async logEvent(waiterId, waiterName, tableNumber, roomName, action, affectedWaiterId = null) {
    this.history.unshift({
      id: 'evt_' + Date.now(),
      timestamp: Date.now(),
      waiterId,
      waiterName,
      tableNumber,
      roomName,
      action,
      affectedWaiterId
    });
    await this.saveHistory();
  },

  async loadStaff() {
    if (this.isStaffLoaded) return;
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        this.waiters = data.waiters || [];
        this.isStaffLoaded = true;
      }
    } catch (e) {
      console.error('Failed to load staff from mock API', e);
    }
  },

  async saveStaff() {
    try {
      await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          waiters: this.waiters
        })
      });
    } catch (e) {
      console.error('Failed to save staff to mock API', e);
    }
  },

  async loadTopology() {
    if (this.isLoaded) return;
    try {
      const res = await fetch('/api/topology');
      if (res.ok) {
        const data = await res.json();
        this.rooms = data.rooms || [];
        this.tableCounter = data.tableCounter || 1;
        this.elementCounter = data.elementCounter || 1;
        if (this.rooms.length > 0 && !this.activeRoomId) {
          this.activeRoomId = this.rooms[0].id;
        }
        this.isLoaded = true;
      }
    } catch (e) {
      console.error('Failed to load topology from mock API', e);
    }
  },

  async saveTopology() {
    try {
      await fetch('/api/topology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: this.rooms,
          tableCounter: this.tableCounter,
          elementCounter: this.elementCounter
        })
      });
    } catch (e) {
      console.error('Failed to save topology to mock API', e);
    }
  }
})

export const stateConfig = {
  disponible: { color: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Disponible', icon: 'check-circle' },
  asignacion: { color: 'bg-amber-50 border-amber-200 text-amber-700', label: 'En Asignación', icon: 'clock' },
  ocupada: { color: 'bg-rose-50 border-rose-200 text-rose-700', label: 'Ocupada', icon: 'users' },
  sucia: { color: 'bg-neutral-100 border-neutral-300 text-neutral-500', label: 'Sucia / Limpieza', icon: 'trash-2' }
}
