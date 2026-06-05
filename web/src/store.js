import { reactive } from 'vue'
import { ZonasService } from './service/zonas'
import { MesasService } from './service/mesas'
import { ElementosService } from './service/elementos'
import { PerfilesService } from './service/perfiles'
import { supabase } from './config/supabase'

const dbToFrontendState = {
  'Disponible': 'disponible',
  'En Asignacion': 'asignacion',
  'Ocupada': 'ocupada',
  'Requiere Limpieza': 'sucia',
  'Inactividad Ambar': 'disponible'
}

const frontendToDbState = {
  'disponible': 'Disponible',
  'asignacion': 'En Asignacion',
  'ocupada': 'Ocupada',
  'sucia': 'Requiere Limpieza'
}

export const store = reactive({
  role: null, // 'admin', 'waiter', null
  rooms: [],
  activeRoomId: null,
  activeTable: null,
  tableCounter: 1,
  elementCounter: 1,
  
  waiters: [],
  activeWaiterId: null,
  activeWaiterName: '',

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
      const data = await PerfilesService.getWaiters();
      this.waiters = data.map(w => ({
        id: w.id,
        name: `${w.nombre} ${w.apellidos}`
      }));
      this.isStaffLoaded = true;
    } catch (e) {
      console.error('Failed to load staff from Supabase', e);
    }
  },

  async loadTopology(force = false) {
    if (this.isLoaded && !force) return;
    try {
      const zonas = await ZonasService.getAll();
      const mesas = await MesasService.getAll();
      const elementos = await ElementosService.getAll();

      const mappedRooms = zonas.map(zona => {
        const zonaMesas = mesas.filter(m => m.zona_id === zona.id).map(m => ({
          id: m.id,
          number: m.numero_mesa,
          capacity: m.capacidad_nominal,
          state: dbToFrontendState[m.estado] || 'disponible',
          x: Number(m.posicion_x),
          y: Number(m.posicion_y),
          lockedUntil: m.bloqueada_hasta ? new Date(m.bloqueada_hasta).getTime() : null,
          lockedBy: m.bloqueada_por || null,
          stateUpdatedAt: m.ultimo_cambio_estado ? new Date(m.ultimo_cambio_estado).getTime() : null,
          assignedTo: m.asignado_a || null,
          guests: m.comensales || null,
          mergeGroup: m.grupo_fusion || null
        }));

        const zonaElementos = elementos.filter(e => e.zona_id === zona.id).map(e => ({
          id: e.id,
          type: e.type,
          x: Number(e.x),
          y: Number(e.y),
          width: Number(e.width),
          height: Number(e.height),
          rotation: Number(e.rotation)
        }));

        return {
          id: zona.id,
          name: zona.nombre,
          colorReferencia: zona.color_referencia || null,
          ordenVisual: zona.orden_visual || 0,
          tables: zonaMesas,
          elements: zonaElementos
        };
      });

      this.rooms = mappedRooms;

      let maxTableNumber = 0;
      mesas.forEach(m => {
        if (m.numero_mesa > maxTableNumber) maxTableNumber = m.numero_mesa;
      });
      this.tableCounter = maxTableNumber + 1;
      this.elementCounter = elementos.length + 1;

      if (this.rooms.length > 0 && !this.activeRoomId) {
        this.activeRoomId = this.rooms[0].id;
      }
      this.isLoaded = true;
    } catch (e) {
      console.error('Failed to load topology from Supabase', e);
    }
  },

  async saveTopology() {
    if (!this.isLoaded) return
    try {
      const { data: dbZonas } = await supabase.from('zonas').select('id');
      const { data: dbMesas } = await supabase.from('mesas').select('id, zona_id');
      const { data: dbElementos } = await supabase.from('elementos_topologia').select('id, zona_id');

      const currentRoomIds = this.rooms.map(r => r.id);
      const currentTableIds = this.rooms.flatMap(r => (r.tables || []).map(t => t.id));
      const currentElementIds = this.rooms.flatMap(r => (r.elements || []).map(e => e.id));

      const zonasToDelete = (dbZonas || []).filter(z => !currentRoomIds.includes(z.id)).map(z => z.id);
      if (zonasToDelete.length > 0) {
        await supabase.from('zonas').delete().in('id', zonasToDelete);
      }

      const mesasToDelete = (dbMesas || []).filter(m => !currentTableIds.includes(m.id)).map(m => m.id);
      if (mesasToDelete.length > 0) {
        await supabase.from('mesas').delete().in('id', mesasToDelete);
      }

      const elementosToDelete = (dbElementos || []).filter(e => !currentElementIds.includes(e.id)).map(e => e.id);
      if (elementosToDelete.length > 0) {
        await supabase.from('elementos_topologia').delete().in('id', elementosToDelete);
      }

      for (const room of this.rooms) {
        await supabase.from('zonas').upsert({
          id: room.id,
          nombre: room.name,
          color_referencia: room.colorReferencia || null,
          orden_visual: room.ordenVisual || 0,
          activa: true
        });

        if (room.tables && room.tables.length > 0) {
          const mesasToUpsert = room.tables.map(t => ({
            id: t.id,
            zona_id: room.id,
            numero_mesa: t.number,
            capacidad_nominal: t.capacity,
            estado: frontendToDbState[t.state] || 'Disponible',
            posicion_x: t.x,
            posicion_y: t.y,
            forma: 'cuadrada',
            rotacion: 0,
            bloqueada_hasta: t.lockedUntil ? new Date(t.lockedUntil).toISOString() : null,
            bloqueada_por: t.lockedBy || null,
            ultimo_cambio_estado: t.stateUpdatedAt ? new Date(t.stateUpdatedAt).toISOString() : null,
            asignado_a: t.assignedTo || null,
            comensales: t.guests || null,
            grupo_fusion: t.mergeGroup || null
          }));
          await supabase.from('mesas').upsert(mesasToUpsert);
        }

        if (room.elements && room.elements.length > 0) {
          const elementosToUpsert = room.elements.map(e => ({
            id: e.id,
            zona_id: room.id,
            type: e.type,
            x: e.x,
            y: e.y,
            width: e.width,
            height: e.height,
            rotation: e.rotation
          }));
          await supabase.from('elementos_topologia').upsert(elementosToUpsert);
        }
      }

    } catch (e) {
      console.error('Failed to save topology to Supabase', e);
    }
  }
})

export const stateConfig = {
  disponible: { color: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Disponible', icon: 'check-circle' },
  asignacion: { color: 'bg-amber-50 border-amber-200 text-amber-700', label: 'En Asignación', icon: 'clock' },
  ocupada: { color: 'bg-rose-50 border-rose-200 text-rose-700', label: 'Ocupada', icon: 'users' },
  sucia: { color: 'bg-neutral-100 border-neutral-300 text-neutral-500', label: 'Sucia / Limpieza', icon: 'trash-2' }
}
