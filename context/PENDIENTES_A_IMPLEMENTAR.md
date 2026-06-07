# Pendientes a Implementar (Ajustes S3)

Basado en los ajustes documentados en `INFO1163_Trabajo3_S3.md` y el estado actual del código.

---

## 1. Override de Capacidad (RN04)

### Problema
Actualmente el camarero solo puede seleccionar comensales desde `1` hasta `capacidad_nominal` de la mesa. No hay forma de exceder ese límite aunque la situación operativa lo requiera (ej. familia con 5 personas y solo hay mesas de 4 disponibles).

**Código actual:** `WaiterDashboard.vue:866-874`
```html
<button v-for="n in activeTableItem.capacity" :key="n" ...>
```

### Solución documentada (S3)
> "Incorporamos un mecanismo de *override* para la RN04, el cual permite al personal de salón autorizar manualmente la asignación de una mesa aun cuando se supere su capacidad nominal."

### Qué hay que hacer
- [ ] Agregar un botón/opción "Exceder capacidad" en el diálogo de asignación
- [ ] Al activarlo, mostrar un input numérico libre (sin límite de capacity) o un selector extendido
- [ ] Persistir el flag `capacidad_override = true` en `sesiones_registro` (la columna ya existe en BD)
- [ ] Mostrar advertencia visual al usar override (ej. icono de advertencia, color diferente)

### Archivos a modificar
- `web/src/views/WaiterDashboard.vue` ~ línea 866
- `web/src/views/WaiterDashboard.vue` ~ línea 467 (`comensales_reales` + nuevo campo `capacidad_override`)
- `web/src/views/AdminOperation.vue` (opcional: override desde admin)

---

## 2. Estado "Limbo Protegido" (RN03 - Handshake)

### Problema
Si el camarero selecciona una mesa y no confirma en 60 segundos, el sistema libera la mesa automáticamente. Si hubo un fallo de red momentáneo, la mesa se libera aunque el camarero estuviera atendiendo físicamente a los clientes. Esto genera "locks fantasmas".

### Solución documentada (S3)
> "Establecimos un protocolo de confirmación en dos pasos (*handshake*) para la RN03. El bloqueo no se libera automáticamente de forma inmediata ante un fallo de confirmación, sino que el sistema entra en un estado transitorio denominado **'Limbo Protegido'** por un periodo máximo de 2 minutos. Esta ventana permite que la terminal del camarero recupere la conexión y finalice la transacción de forma segura."

### Qué hay que hacer
- [ ] Agregar nuevo estado `limbo` (o extender `asignacion` con una segunda fase) en la máquina de estados
- [ ] Modificar el timer de 60s actual: al expirar, NO revertir a `disponible` inmediatamente, sino pasar a `limbo`
- [ ] En estado `limbo`: la mesa sigue bloqueada para otros camareros por 2 min adicionales
- [ ] Si el camarero original confirma dentro del limbo → pasa a `ocupada`
- [ ] Si expiran los 2 min de limbo → recién ahí revertir a `disponible`
- [ ] Agregar el estado al `stateConfig` en `store.js` con color/icono
- [ ] Actualizar el diálogo del camarero para mostrar el estado "Limbo Protegido"
- [ ] Actualizar `AdminOperation.vue` para soportar el nuevo estado

### Archivos a modificar
- `web/src/views/WaiterDashboard.vue` ~ líneas 77-92 (timer loop) y 436-439 (lock creation)
- `web/src/store.js` ~ `stateConfig` y lógica de mapeo
- `web/src/views/AdminOperation.vue` ~ timer loop y force states
- DB: puede requerir nuevo valor en columna `estado` de `mesas`

---

## 3. Cancelación de Asignación sin Limpieza

### Problema
Si un cliente se retira prematuramente sin consumir, el sistema obliga a pasar por `Ocupada → Sucia → Disponible`. No existe una ruta directa `Ocupada → Disponible` para casos donde no hubo consumo real. Esto genera un "secuestro digital" de la mesa.

### Solución documentada (S3)
> "Introdujimos la función de **'Cancelar Asignación'** que permite que una mesa regrese al estado 'Disponible' sin cumplir la transición obligatoria de limpieza (RN01 y RN02), siempre que el sistema verifique mediante la entidad **Sesion_Registro** que no se registró actividad física ni consumo por parte de los clientes."

### Qué hay que hacer
- [ ] Agregar botón "Cancelar Asignación" en el diálogo de estado `ocupada` (solo visible para el camarero dueño)
- [ ] Antes de cancelar, verificar que no existan `pedidos` asociados a la `sesion_registro` activa (tabla `pedidos` ya existe pero no se usa)
- [ ] Si no hay pedidos → permitir `ocupada → disponible` directamente, sin crear registro de limpieza
- [ ] Al cancelar: finalizar la `sesion_registro` con estado `'Cancelada'` (campo `estado` ya existe en `sesiones_registro`)
- [ ] Opcional: agregar confirmación "¿Estás seguro? Esto solo es válido si los clientes no consumieron"
- [ ] En `AdminOperation.vue`: habilitar el botón "Disponible" cuando la mesa esté `ocupada` (actualmente está deshabilitado)

### Archivos a modificar
- `web/src/views/WaiterDashboard.vue` ~ línea 937-941 (agregar nuevo botón en template `ocupada`)
- `web/src/views/WaiterDashboard.vue` ~ línea 489 (agregar condición para `previousState === 'ocupada'`)
- `web/src/views/AdminOperation.vue` ~ línea 406 (habilitar botón disponible para ocupada)
- `web/src/service/pedidos.js` ~ consultar si hay pedidos activos (servicio existe pero no se usa)

---

## 4. Timeout de Inactividad de 15 min (Asignación Inicial)

### Problema
Actualmente no existe un timeout que libere mesas que fueron asignadas pero nunca confirmadas ni liberadas manualmente. Solo existe el bloqueo de 60 segundos de la RN03.

### Contexto documentado (S1/S2)
> **RN03 (original):** "Si una mesa es asignada pero no registra actividad (marcado de pedidos u ocupación confirmada) tras 15 minutos, ejecuta la liberación automática."
>
> **Decisión III (S2):** "¿Han pasado 15 minutos desde la asignación inicial sin registrar ninguna actividad ni confirmación en esa mesa? → El sistema asume que el cliente se retiró o fue un error, por lo que decide liberar la mesa automáticamente."

### Qué hay que hacer
- [ ] En el timer loop (cada 1s), agregar lógica para mesas en estado `asignacion` que detecte si han pasado **15 minutos** desde que se creó el lock
- [ ] Si `Date.now() - table.stateUpdatedAt >= 900000` (15 min en ms) → liberar la mesa automáticamente (revertir a `disponible`)
- [ ] Esto es independiente del lock de 60s actual. El orden sería:
  1. Se selecciona mesa → lock de 60s + `stateUpdatedAt` = ahora
  2. Si expiran 60s sin confirmar → entra en **Limbo Protegido** (ítem 2) por 2 min
  3. Si expiran 15 min total desde `stateUpdatedAt` sin actividad → liberación automática definitiva
- [ ] Agregar notificación/alerta visual cuando ocurra esta liberación automática
- [ ] Loggear el evento en `historial_eventos`

### Archivos a modificar
- `web/src/views/WaiterDashboard.vue` ~ timer loop (después de línea 93, agregar nueva condición)
- `web/src/store.js` ~ posible actualización de lógica de estado

---

## Resumen de Archivos a Modificar

| Archivo | Ítem 1 | Ítem 2 | Ítem 3 | Ítem 4 |
|---------|--------|--------|--------|--------|
| `WaiterDashboard.vue` | ✅ | ✅ | ✅ | ✅ |
| `AdminOperation.vue` | opcional | ✅ | ✅ | |
| `store.js` | | ✅ | | |
| `sesiones_registro.js` | | | ✅ | |
| `pedidos.js` | | | ✅ | |
