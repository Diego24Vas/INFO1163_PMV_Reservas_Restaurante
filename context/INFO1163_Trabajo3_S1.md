

# Reservas Con Representación Visual

## Semana 1

Integrantes: 

- Elias Caranza  
- Diego Vasquez

Asignatura: 

- DESARROLLO DE APLICACIONES EMPRESARIALES

26 abril

## 1\. Descripción del problema

El desafío de fondo en un restaurante no es simplemente "anotar una mesa", sino lograr que el sistema sea un reflejo exacto de lo que está pasando físicamente en el salón en cada momento. Esta herramienta permite que tanto garzones como administradores tengan el control total de la ocupación en tiempo real, eliminando la necesidad de estar supervisando cada rincón de forma presencial para saber qué está ocurriendo. Más allá de facilitar el turno, el sistema convierte el movimiento diario en datos valiosos: permite identificar con precisión las horas de mayor demanda, cuáles son las mesas que más rotan o cuánto tiempo pasan realmente los clientes consumiendo. En definitiva, se trata de dejar de adivinar y empezar a usar información real para que el negocio funcione de manera mucho más fluida y rentable.

## 2\. Actores identificados

**Camarero (Garzón)**

- Es el usuario operativo de primera línea, responsable de la actualización del estado físico de las mesas en el entorno digital.  
    
  - **Operaciones principales:** Realiza la transición de estados de las mesas (Ocupada, Por Limpiar, Limpiando, Disponible).  
  - **Control de flujo:** Es quien notifica al sistema cuando una mesa ha sido liberada por el cliente, disparando el estado intermedio de "Limpieza".  
  - **Interfaz:** Utiliza dispositivos móviles o terminales de punto de venta (POS) para interactuar con el mapa de mesas en tiempo real.

**Administrador** 

- Posee el nivel más alto de privilegios, encargado de la arquitectura lógica y operativa del establecimiento.

- **Configuración de Topología:** Define y modifica el diseño del mapa del restaurante (número de mesas, posición, capacidad de personas por mesa y zonas/sectores).  
- **Gestión de Personal:** Crea y gestiona los perfiles de usuario (Camareros y Hostess), además de la asignación de turnos y zonas de responsabilidad.  
- **Auditoría y Reportes:** Accede a la extracción de datos históricos y métricas de rendimiento, como el tiempo promedio de rotación de mesas y eficiencia de limpieza.  
- **Parametrización:** Define las reglas globales, como la duración de los *timeouts* y los umbrales de las alertas de inactividad.

 **Hostess**

- Actúa como el coordinador de flujo y el primer punto de contacto entre el cliente y el sistema.

- **Disparador de Eventos (Trigger):** Inicia el ciclo de vida de una mesa en el sistema al marcar la "Asignación Inicial", lo que bloquea la mesa para otros usuarios.  
- **Monitoreo en Tiempo Real:** Supervisa el estado global del salón para informar tiempos de espera estimados a los clientes que llegan.

**Sistema (Actor Automatizado)**

- Es el motor lógico que garantiza que las reglas de negocio se cumplan sin intervención humana directa.

- **Gestor de Persistencia y Concurrencia:** Ejecuta y controla los bloqueos temporales de 60 segundos para evitar que dos actores modifiquen la misma mesa simultáneamente.  
- **Orquestador de Time-outs:** Monitorea los eventos de inactividad. Si una mesa es asignada pero no registra actividad (marcado de pedidos u ocupación confirmada) tras 15 minutos, ejecuta la liberación automática.  
- **Servicio de Notificaciones:** Emite alertas automáticas al Administrador o al personal de limpieza cuando una mesa supera los tiempos de espera definidos.  
- **Sincronización:** Actúa como el *backend* que propaga los cambios de estado a través de WebSockets o sistemas similares para que todos los demás actores vean la información actualizada al instante.

## 3\. Flujo principal (Paso a paso)

1\. La Preparación (Precondiciones)  
    Antes de abrir las puertas al público, hay un trabajo que ya debe estar listo:

* El Administrador configura el "terreno de trabajo": dibuja el mapa del local en el sistema, define cuántas mesas hay, su capacidad y en qué zonas están.    
    
* También se encarga de crear los usuarios para el equipo que trabajará en el turno y configura las reglas generales, con esto listo, el restaurante abre.


2\. El Día a Día (Flujo Principal)  
    Aquí es donde se resuelve el problema de tener el mapa sincronizado con la realidad. Imagina que llega un grupo de clientes:

* El cliente entra al lugar y es atendido, ahí el **camarero** se acerca a atender y les asigna la mesa correspondiente en el sistema, lo que inicia todo el ciclo.  
    
    
* Apenas selecciona la mesa, el Sistema le pone un "**candado**" de 60 segundos. Esto es vital para que un camarero del otro lado del salón no intente sentar a nadie en ese mismo lugar por accidente.


* Una vez que el camarero confirma la mesa. Desde ese momento, el sistema sabe que la mesa está "**Ocupada**" y que ese camarero en específico es el **único** dueño de su atención. (Si nadie confirma en 60 segundos, el sistema suelta la mesa automáticamente).    
    
* Mientras los clientes comen, el Sistema se queda de guardia de forma silenciosa. Si pasan 15 minutos desde que se sentaron y no hay actividad, libera la mesa asumiendo que se fueron. Por otro lado, si llevan más de dos horas ocupándola, la pinta de color ámbar en el mapa para que el Camarero eche un vistazo y **verifique** si la mesa sigue activa.    
    
* Los clientes terminan y se van. El Camarero avisa al sistema, pero la mesa no se pone verde ("Disponible") de inmediato. Pasa **obligatoriamente** a estado "**Sucia**".    
    
* El Sistema empieza a contar otra vez. Si pasan 10 minutos y la mesa sigue sucia, manda una alerta urgente al camarero “**dueño**” de esa mesa.    
    
* Una vez que la limpieza física termina, el Camarero lo confirma en su pantalla. La mesa vuelve a brillar como "**Disponible**", la información se actualiza para todos en tiempo real, y el ciclo está listo para empezar de nuevo.  

# Anexos Tecnicos

## Reglas de negocios (RN) (Borrador)

**Reglas de Integridad de Estado (Disponibilidad):** Estas reglas dictan qué se puede y qué no se puede hacer con una mesa física.

- **RN01 \- Exclusividad de Estado:** Una mesa solo puede tener un estado activo a la vez (ej. No puede estar Disponible y Sucia simultáneamente).

- **RN02 \- Transición Obligatoria de Higiene:** Una mesa que pasa de estado Ocupada a Disponible debe pasar obligatoriamente por el estado Sucia/En Limpieza. El sistema no permitirá marcarla como Disponible hasta que se confirme la limpieza.

- **RN03 \- Bloqueo de Selección:** Al momento de que un camarero selecciona una mesa en el mapa, el sistema debe aplicar un Bloqueo de Escritura (Lock) de máximo 60 segundos. Si no se confirma la ocupación en ese tiempo, la mesa vuelve a su estado anterior automáticamente.

**Reglas de Capacidad y Asignación:** Estas reglas aseguran que el restaurante se use de forma eficiente.

- **RN04 \- Validación de Capacidad:** El sistema emitirá una alerta si el número de comensales ingresado por el camarero supera la capacidad nominal de la mesa definida en la base de datos.

- **RN05 \- Fusión de Mesas (Merging):** Solo el Administrador o el Hostess pueden autorizar la fusión de dos o más entidades Mesa para crear una unidad lógica superior. La liberación de esta unidad debe liberar todas las mesas físicas implicadas.  
    
- **RN06 \- Propiedad de Atención:** Una mesa en estado Ocupado queda vinculada al ID del camarero que realizó la apertura. Solo ese camarero o un Administrador pueden modificar el estado de esa mesa (evita interferencias entre compañeros).

**Reglas de Gestión de Tiempos (SLA Interno)**

- **RN07 \- Alerta de Inactividad (Stale Table):** Si una mesa permanece en estado Ocupada por más de 120 minutos sin actualizaciones en el sistema de pedidos (si estuviera integrado), el mapa visual debe resaltar la mesa en color ámbar para que el camarero verifique el estado.

- **RN08 \- Tiempo Máximo de Limpieza:** Si una mesa permanece en estado Sucia por más de 10 minutos, el sistema enviará una notificación de alta prioridad al perfil de "Mantenimiento" o "Limpieza".

