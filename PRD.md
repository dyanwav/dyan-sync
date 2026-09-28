# PRD: LyricSync Studio — v2 (Final)

**Estado:** Listo para desarrollo del Prototipo 1 **Cambios respecto a v1:** ver [Anexo A](#anexo-a-cambios-principales-respecto-a-v1)

---

## 1. Resumen ejecutivo

### 1.1 Visión

LyricSync Studio es una herramienta web **100% client-side** para músicos independientes, editores de letras y creadores de contenido. Permite:

1. Importar una pista de audio y su letra en texto plano.
2. Sincronizarlas en tiempo real con un motor de marcación manual (*tap-to-sync*).
3. Previsualizarlas en un visor vertical 9:16 de estética tipográfica moderna (inspirada en las vistas de letras de las apps de streaming, sin usar su nombre ni su branding).
4. Exportarlas como archivo `.lrc` o como video vertical MP4 listo para Instagram Stories, Reels y TikTok.



### 1.2 Hipótesis central a validar

> Sincronizar una canción completa con teclado y exportar un clip vertical de calidad debe ser **más rápido y simple** que las alternativas actuales (editores de video o herramientas de sincronización web).

Todo el alcance del MVP se evalúa contra esta hipótesis. Lo que no la valida se pospone.

### 1.3 Principios de diseño

1. **Un solo renderer.** La preview y la exportación usan la misma función de dibujo. Lo que se ve es lo que se exporta.
2. **El reloj de audio es la fuente de verdad.** Nunca `setTimeout`/`setInterval`; nunca el estado de React para el tiempo de reproducción.
3. **Determinismo.** Un frame es función pura del tiempo `t` y del proyecto. Sin estado acumulado entre frames.
4. **Nunca perder el trabajo del usuario.** Autoguardado, deshacer y respaldo exportable.
5. **Privacidad real.** Ningún dato del usuario sale del navegador, incluidas las fuentes tipográficas.

---



## 2. Alcance



### 2.1 Dentro del MVP (Prototipos 1–3)

- Carga de audio, metadatos y letra.
- Motor de sincronización con deshacer, calibración de latencia y cuenta regresiva.
- Tabla de ajuste fino con waveform.
- Visor 9:16 en Canvas con fondos por carátula o gradientes predefinidos.
- Exportación `.lrc` (y importación de `.lrc`).
- Exportación de video MP4 (1080×1920, 30 fps) con selección de rango.
- Persistencia local del proyecto (incluido el audio) y respaldo `.lyricsync.json`.
- Interfaz en español e inglés.



### 2.2 Fuera del MVP (backlog)

- Fuentes personalizadas subidas por el usuario (`.woff2`).
- Grano, viñeta y efectos avanzados de texto.
- Soporte táctil y móvil para sincronizar.
- Sincronización por palabra (karaoke) y `.lrc` extendido.
- Auto-alineación asistida con un modelo local.
- Plantillas de estilo compartibles.



### 2.3 Plataformas soportadas


| Nivel       | Navegadores                                           | Garantía                                                                                                                                            |
| ----------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nivel 1** | Chrome, Edge, Brave (últimas 2 versiones, escritorio) | Todo el MVP                                                                                                                                         |
| **Nivel 2** | Firefox y Safari de escritorio (Safari 16.4+)         | Sync, visor y `.lrc` garantizados. Video por detección de características; si no hay WebCodecs, fallback a `MediaRecorder` en tiempo real con aviso |
| **Nivel 3** | Móvil / tablet                                        | No soportado en el MVP. Se muestra un aviso claro; solo lectura de proyectos exportados                                                             |


---



## 3. Usuarios objetivo y casos de uso


| Perfil                           | Necesidad principal                                              | Caso de uso crítico                                                |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Músico / artista emergente**   | Promoción visual sin software complejo (After Effects, Premiere) | Crear un clip vertical con las estrofas clave para Stories y Reels |
| **Editor de letras**             | Generar `.lrc` sincronizados rápido                              | Sincronizar un tema completo en una pasada y exportar el `.lrc`    |
| **Creador de contenido musical** | Videos con letras estilizadas                                    | Personalizar el fondo según la carátula y descargar clips cortos   |


> **Por verificar:** que el `.lrc` sea el formato aceptado por distribuidoras y plataformas de letras (DistroKid, Musixmatch, etc.). No se presenta como caso de uso garantizado hasta confirmarlo con cada proveedor.

---



## 4. Modelo de datos

```ts
type LyricLine = {
  id: string;                       // uuid inmutable
  text: string;
  kind: 'lyric' | 'section' | 'instrumental';
  start: number | null;             // segundos (float)
  end: number | null;               // derivado del siguiente start o explícito
  status: 'pending' | 'synced' | 'unassigned';
  // words?: { text: string; start: number }[]  // reservado para v2 (karaoke)
};

type Project = {
  id: string;
  schemaVersion: number;            // para migraciones futuras
  meta: { title: string; artist: string; album?: string; coverId?: string };
  audio: { blobId: string; name: string; size: number; duration: number };
  lines: LyricLine[];
  settings: {
    tapOffsetMs: number;            // compensación de reacción humana
    debounceMs: number;
    playbackRate: 0.75 | 1 | 1.25;
    theme: ThemeConfig;
    exportRange?: { start: number; end: number };
  };
  updatedAt: number;
};
```

**Reglas:**

- `end` de una línea `lyric` se deriva del `start` de la siguiente línea con `start` definido, salvo que exista un marcador `instrumental` (silencio) que la cierre antes.
- Las líneas `section` (`[Coro]`, `[Verso 1]`) no se sincronizan ni se dibujan por defecto (configurable).
- Los tiempos se almacenan en **segundos con precisión de milisegundos**; el `.lrc` los redondea a centésimas.

---



## 5. Requisitos funcionales



### Módulo 1 — Ingesta y parsing

- **RF1.1 Carga de audio.** Drag-and-drop o selector de archivo: `.mp3`, `.wav`, `.aac`, `.flac`, `.ogg`, `.m4a`.
- **RF1.2 Metadatos.** Extracción de título, artista y portada desde etiquetas (librería `music-metadata` cargada de forma diferida). Campos editables si faltan.
- **RF1.3 Letra.** `textarea` para pegar texto plano, además de importar un `.lrc` existente (soporta múltiples marcas por línea, cabeceras `[ti:]`, `[ar:]`, `[offset:]`).
- **RF1.4 Parser.**
  - Elimina líneas vacías consecutivas y espacios sobrantes.
  - Detecta etiquetas de sección (`[Coro]`, `[Verso 1]`, etc.) y las marca como `section` (no sincronizables por defecto).
  - Asigna `id` único inmutable por línea.
- **RF1.5 Aviso legal.** Al primer uso se muestra un aviso: el usuario declara tener derechos sobre el audio y la letra que procesa.



### Módulo 2 — Motor de sincronización (Tapper)

- **RF2.1 Marcación.**
  - En modo captura, `Espacio` registra `start` de la línea actual y cierra el `end` de la anterior. El puntero avanza a la siguiente línea pendiente.
  - Se ignora `event.repeat` (tecla mantenida).
  - Los atajos se desactivan si el foco está en `input`, `textarea` o `contenteditable`.
- **RF2.2 Deshacer.** `Backspace` deshace la última marca, mueve el puntero atrás y hace seek unos segundos antes para reintentar. Historial de al menos 50 acciones (`Ctrl/Cmd+Z` también).
- **RF2.3 Marcador de silencio.** Tecla `B` inserta un marcador `instrumental` que cierra la línea anterior sin mostrar texto (para intros, puentes y final de la canción).
- **RF2.4 Saltar línea.** Tecla `S` deja la línea actual como `unassigned` y avanza.
- **RF2.5 Cuenta regresiva.** Al pulsar "Iniciar sync": cuenta 3-2-1 y pre-roll configurable (0–3 s).
- **RF2.6 Transporte.**
  - Play/Pause: `K` o control de UI.
  - Saltos de ±3 s: `J`/`L` y flechas.
  - Velocidad: 0.75×, 1.0×, 1.25×.
  - Clic en cualquier línea de la tabla o en el waveform hace seek a ese punto.
- **RF2.7 Calibración de latencia.** Asistente de 8 pulsaciones sobre un metrónomo; el offset resultante (mediana) se guarda como `tapOffsetMs` (valor inicial por defecto: −120 ms). El usuario puede ajustarlo a mano.
- **RF2.8 Antirrebote.** Ventana configurable, por defecto 70 ms (rango 0–200 ms). Pulsaciones dentro de la ventana se descartan.
- **RF2.9 Ajuste fino (tabla + waveform).**
  - Tabla editable con `[mm:ss.xxx]`, edición numérica y botones ±50 ms / ±100 ms.
  - Opción "desplazar también las siguientes líneas" para correcciones globales.
  - Re-grabación individual de una línea.
  - Waveform (picos calculados del `AudioBuffer`) con marcadores arrastrables.
  - Indicador de estado por línea (`pending` / `synced` / `unassigned`).



### Módulo 3 — Visor 9:16 (Canvas)

- **RF3.1 Renderer único.** La función pura `renderFrame(ctx, scene, t)` dibuja el visor. La preview la ejecuta en un `<canvas>` con `requestAnimationFrame`; el exportador la ejecuta sobre un `OffscreenCanvas` a 1080×1920. No existe un segundo renderer en DOM/CSS.
- **RF3.2 Layout.**
  - Contenedor con relación 9:16 bloqueada.
  - Saltos de línea (wrap) y métricas de texto calculados una vez por combinación fuente/ancho y cacheados.
  - La línea activa se ancla en el eje vertical medio-superior.
- **RF3.3 Scroll determinista.** La posición vertical es una función de `t`: interpolación con easing entre el centro de la línea anterior y el de la actual durante una ventana de 350 ms tras cada `start`. **No se usa** `lerp` **con estado**, para que preview y exportación produzcan frames idénticos con cualquier fps.
- **RF3.4 Tipografía dinámica.**
  - Línea activa: opacidad 100 %, escala 1.05×, blanco `#FFFFFF`, sombra difusa.
  - Previas: 60 %.
  - Futuras: 20–25 %.
  - Lookahead visual configurable (por defecto 150 ms): la línea se resalta ligeramente antes de su `start` para que se perciba en tiempo.
  - El desenfoque de líneas futuras es opcional y se pre-renderiza (no se usa `ctx.filter` por frame).
- **RF3.5 Fondos.**
  - **Modo carátula:** paleta dominante extraída de una versión reducida (64×64) de la imagen (`colorthief` modular o implementación propia); gradiente radial con blur **pre-renderizado una sola vez** en un `ImageBitmap`. Se ajusta luminosidad para garantizar contraste mínimo 4.5:1 con el texto blanco.
  - **Modo personalizado:** gradientes predefinidos (Dark, Acid, Sunset, Cyberpunk, Monochrome).
- **RF3.6 Fuentes.** Fuentes con licencia abierta (SIL OFL), **autoalojadas** en el bundle. Se espera `document.fonts.load()` antes del primer frame de preview o export.



### Módulo 4 — Exportación

- **RF4.1** `.lrc`**.**
  - Formato `[mm:ss.xx] Texto`, codificación UTF-8 sin BOM, saltos de línea `\n`.
  - Cabeceras: `[ti:]`, `[ar:]`, `[al:]` (si existe), `[length:mm:ss]`.
  - Marcadores `instrumental` se exportan como línea con marca y texto vacío.
  - Opción para incluir o no las líneas `section`.
- **RF4.2 Video vertical (ruta principal: WebCodecs).**
  - Frames dibujados por `renderFrame` en un `OffscreenCanvas` dentro de un Web Worker.
  - Video: `VideoEncoder` H.264 (High profile; validar el string de códec con `VideoEncoder.isConfigSupported()`).
  - Audio: se renderiza el rango con `OfflineAudioContext` y se codifica con `AudioEncoder` (AAC) cuando esté disponible.
  - Muxing a **MP4** con `mediabunny` (o `mp4-muxer`).
  - Exportación **determinista** y más rápida que el tiempo real; no exige mantener la pestaña en foco.
  - Ajustes: 1080×1920 (defecto) o 720×1280; **30 fps por defecto**, 60 fps opcional; bitrate por defecto 8 Mbps.
  - Barra de progreso, cancelación y estimación de tiempo restante.
- **RF4.3 Video (ruta fallback: MediaRecorder).**
  - Se usa solo si WebCodecs no está disponible o falla.
  - Comprobación con `MediaRecorder.isTypeSupported()` en este orden: `video/mp4;codecs=avc1`, `video/webm;codecs=vp9,opus`, `video/webm;codecs=vp8,opus`.
  - Se advierte al usuario: grabación en tiempo real, mantener la pestaña visible; se activa `Screen Wake Lock` si está disponible.
  - Los WebM se post-procesan para escribir la duración en los metadatos.
- **RF4.4 Rango de exportación.** Selector de tramo (arrastrando sobre el waveform o con campos numéricos) con atajos de 15/30/60 s. Por defecto: la sección de la canción con más líneas sincronizadas consecutivas.



### Módulo 5 — Persistencia y proyecto

- **RF5.1 Autoguardado en IndexedDB** (con Dexie o `idb-keyval`): proyecto completo, incluyendo el `Blob` de audio y la portada. Guardado cada 5 marcas o 2 s de inactividad, y en `beforeunload`.
- **RF5.2 Lista de proyectos recientes** en la pantalla de inicio, con opción de eliminar.
- **RF5.3 Respaldo.** Exportar/importar `.lyricsync.json` (letra, marcas y ajustes, sin audio). Al importar se pide vincular el audio; se valida por nombre, tamaño y duración.
- **RF5.4 Aviso de almacenamiento.** Si el navegador limita la cuota o el almacenamiento persistente no está concedido (`navigator.storage.persist()`), se avisa y se recomienda exportar un respaldo. Safari puede limpiar el almacenamiento de sitios inactivos.



### Módulo 6 — Interfaz y accesibilidad

- **RF6.1 i18n.** Español e inglés desde el inicio; idioma inicial según `navigator.language`.
- **RF6.2 Teclado.** Todos los flujos operables con teclado; `Espacio` se comporta como tap solo en modo captura. Panel de atajos visible (`?`).
- **RF6.3 Accesibilidad.** Foco visible, contraste AA en la UI, `aria-live` para estados de sincronización, respeto de `prefers-reduced-motion` en animaciones de UI (no afecta al export).

---



## 6. Requisitos no funcionales


| ID       | Requisito                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR1** | **Fluidez.** La preview apunta a 60 fps en escritorio de gama media; presupuesto de frame 8 ms de JS. Sin layout thrashing (todo el visor es Canvas).                                                                                                                                                                      |
| **NFR2** | **Reloj de tiempo.** Reproducción con `AudioContext` + `AudioBufferSourceNode` como ruta principal; el tiempo del tap se mapea al reloj de audio con `event.timeStamp` y `AudioContext.getOutputTimestamp()`, compensando `outputLatency` cuando esté disponible. `setTimeout`/`setInterval` prohibidos para medir tiempo. |
| **NFR3** | **Estado de alta frecuencia.** `currentTime` NO vive en el store global de React; se lee desde un objeto mutable dentro del loop de `rAF`. El store solo guarda la línea activa y estados discretos.                                                                                                                       |
| **NFR4** | **Privacidad.** Ningún audio, imagen, texto ni fuente se solicita o envía a servidores de terceros. Sin analíticas de terceros. Si se mide uso, solo contadores agregados y sin contenido, y siempre opcionales.                                                                                                           |
| **NFR5** | **Memoria.** Se decodifica a `AudioBuffer` solo hasta un límite razonable (aprox. 15 min o 250 MB decodificados). Sobre ese límite: modo streaming con `<audio>` + `createMediaElementSource`, precisión reducida, aviso visible y exportación de video deshabilitada.                                                     |
| **NFR6** | **Compatibilidad.** Ver tabla de niveles (sección 2.3). Detección de características, nunca por user agent.                                                                                                                                                                                                                |
| **NFR7** | **Resiliencia.** Ningún error de exportación, decodificación o almacenamiento debe perder el proyecto. Todo error tiene mensaje accionable.                                                                                                                                                                                |
| **NFR8** | **Licencias.** Solo fuentes y assets con licencia que permita redistribución. Sin nombres ni marcas de terceros en la UI o el marketing.                                                                                                                                                                                   |


---



## 7. KPIs y criterios de éxito (medibles)


| KPI                                                                 | Meta                                                                     | Cómo se mide                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| Tiempo para sincronizar una canción de 3 min (incluye correcciones) | ≤ 10 min                                                                 | Pruebas con 5+ usuarios reales             |
| Precisión de sincronización tras calibración                        | ≥ 90 % de las líneas con error ≤ ±80 ms respecto a una referencia manual | Comparación contra `.lrc` de referencia    |
| Tiempo de exportación (clip de 30 s, 1080×1920, 30 fps)             | ≤ 30 s en laptop de gama media                                           | Cronómetro en el set de pruebas            |
| Frames perdidos en exportación                                      | 0 (ruta WebCodecs)                                                       | Conteo de frames codificados vs. esperados |
| Éxito de exportación por navegador                                  | ≥ 95 % en el set de pruebas                                              | Matriz de pruebas (sección 10)             |
| Pérdida de progreso tras recarga o cierre                           | 0 casos                                                                  | Pruebas de recarga durante sync            |


---



## 8. Arquitectura técnica

```
┌──────────────────────────────────────────────────────────────┐
│                          FRONTEND                            │
│                                                              │
│  ┌───────────────────────┐    ┌───────────────────────────┐  │
│  │      UI (React)       │    │      Estado (Zustand)     │  │
│  │ Tailwind v4 + shadcn  │◄──►│ project / sync / ui       │  │
│  └──────────┬────────────┘    │ (sin currentTime)         │  │
│             │                 └──────────────┬────────────┘  │
│             ▼                                ▼               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            Audio & Sync Engine (módulo TS puro)        │  │
│  │  AudioContext · AudioBuffer · reloj mutable            │  │
│  │  Mapeo event.timeStamp → tiempo de audio + offset      │  │
│  └──────────┬─────────────────────────────┬───────────────┘  │
│             ▼                             ▼                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │      renderFrame(ctx, scene, t)  — función pura        │  │
│  └──────────┬─────────────────────────────┬───────────────┘  │
│             ▼                             ▼                  │
│  ┌───────────────────────┐    ┌───────────────────────────┐  │
│  │ Preview <canvas> 9:16 │    │ Export Worker             │  │
│  │ rAF + reloj de audio  │    │ OffscreenCanvas 1080×1920 │  │
│  └───────────────────────┘    │ VideoEncoder + AudioEnc.  │  │
│                               │ Muxer MP4 → descarga      │  │
│                               └───────────────────────────┘  │
│                                                              │
│  Persistencia: IndexedDB (proyectos, audio, portada, ajustes)│
└──────────────────────────────────────────────────────────────┘
```



### Stack

- **Build/UI:** Vite + React 19 + TypeScript (modo estricto). Se descarta Next.js por ser una app 100% client-side que depende de `window`, `AudioContext` y Workers.
- **Estilos:** Tailwind CSS v4 + shadcn/ui (Radix).
- **Estado:** Zustand con slices `project`, `sync`, `ui`. El tiempo de reproducción queda fuera del store (NFR3).
- **Audio:** Web Audio API; `music-metadata` (diferido) para etiquetas y portada.
- **Video:** WebCodecs + `mediabunny`/`mp4-muxer`; fallback `MediaRecorder`.
- **Persistencia:** Dexie o `idb-keyval`.
- **Waveform:** picos propios calculados del `AudioBuffer` (o `wavesurfer.js` si acelera el desarrollo).
- **Color:** `colorthief` modular o implementación propia sobre un canvas reducido, dentro de un Worker.
- **Hosting:** sitio estático (Cloudflare Pages o Vercel). Sin backend.



### Decisiones de rendimiento

- Fondo (gradiente + blur) y, en fases posteriores, grano: pre-renderizados una vez en `ImageBitmap`/tile.
- Texto: `wrap` y métricas cacheados; el texto de cada línea puede pre-rasterizarse si el perfilado lo requiere.
- Sin `ctx.filter` por frame (costoso y con soporte irregular en Safari).
- La exportación corre en Worker: la UI no se congela.

---



## 9. Flujo de usuario

```
[1. Configuración]
  Subir audio → Pegar letra (o importar .lrc) → Completar metadatos / portada
        │
        ▼
[2. Calibración (primera vez o bajo demanda)]
  Metrónomo de 8 pulsaciones → se guarda tapOffsetMs
        │
        ▼
[3. Sincronización]
  "Iniciar sync" → cuenta 3-2-1 → Espacio al inicio de cada línea
  B = silencio · S = saltar · Backspace = deshacer · J/K/L = transporte
        │
        ▼
[4. Refinamiento]
  Tabla + waveform → ±50/±100 ms → clic para probar → re-grabar una línea
        │
        ▼
[5. Personalización y preview]
  Fondo (carátula / gradiente) · tipografía · preview 9:16 en Canvas
        │
        ▼
[6. Exportación]
  ├─ .lrc (descarga inmediata)
  └─ Video: elegir rango → 30/60 fps → render (Worker) → descarga MP4
```

---



## 10. Casos límite y manejo de errores


| Escenario                                          | Comportamiento                                                                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Doble pulsación accidental de `Espacio`            | Antirrebote configurable (70 ms por defecto); `event.repeat` ignorado                                             |
| Letra más larga que la canción                     | Al terminar el audio, se detiene el sync y las líneas restantes quedan `unassigned` con aviso visible             |
| Foco en un campo de texto                          | Los atajos globales se desactivan; no se registran taps                                                           |
| Audio muy pesado / larguísimo                      | Modo streaming con `<audio>`; precisión reducida y sin exportación de video; aviso claro                          |
| MP3 VBR sin cabecera Xing                          | Se detecta imprecisión de duración/seek; se sugiere convertir a CBR/otro formato. Incluido en el set de pruebas   |
| Sin soporte de WebCodecs                           | Fallback a `MediaRecorder` (tiempo real) con avisos; si tampoco hay soporte, mensaje con navegadores recomendados |
| `MediaRecorder` sin ningún códec compatible        | Se ofrece exportar solo `.lrc` y, opcionalmente, secuencia de imágenes PNG del rango (backlog)                    |
| Cambio de pestaña durante export                   | Ruta WebCodecs: sin efecto. Ruta fallback: pausa automática y aviso                                               |
| Audio con latencia alta (Bluetooth)                | Se recomienda audífonos con cable o recalibrar; `outputLatency` se usa si el navegador lo expone                  |
| Cuota de IndexedDB excedida                        | Aviso con opción de exportar respaldo; el proyecto en memoria sigue funcionando                                   |
| Recarga o cierre accidental                        | `beforeunload` si hay cambios sin guardar; el proyecto se restaura desde IndexedDB al volver                      |
| Audio no coincide al importar un `.lyricsync.json` | Advertencia por diferencia de nombre/tamaño/duración; el usuario decide continuar                                 |
| Fuente no cargada al exportar                      | Se espera `document.fonts.load()`; si falla, se usa la fuente de respaldo y se avisa                              |


---



## 11. Plan de pruebas

**Set de audio (mínimo):** MP3 CBR, MP3 VBR sin Xing, WAV, FLAC, M4A/AAC, OGG; una canción lenta, un rap rápido y una con intro instrumental larga.

**Matriz de navegadores:** Chrome, Edge, Firefox, Safari (escritorio).

**Casos clave:**

- Calibración de latencia con altavoces y con audífonos Bluetooth.
- Sync completo → recarga a mitad → recuperación del proyecto.
- Exportar rango de 15/30/60 s en cada navegador y verificar reproducción del MP4 en Instagram/TikTok (subida real de prueba).
- Comparar frame de preview vs. frame exportado en el mismo `t` (deben coincidir).
- Prueba de rendimiento del visor con letras largas (100+ líneas).

---



## 12. Riesgos y mitigaciones


| Riesgo                                                        | Prob. | Impacto | Mitigación                                                                        |
| ------------------------------------------------------------- | ----- | ------- | --------------------------------------------------------------------------------- |
| WebCodecs/AudioEncoder no disponible en algún navegador       | Media | Alto    | Detección de características + fallback `MediaRecorder` + alternativa solo `.lrc` |
| Latencia percibida al marcar (reacción humana, dispositivos)  | Alta  | Alto    | Calibración, `tapOffsetMs`, tabla de ajuste fino, lookahead visual                |
| Diferencias entre preview y video exportado                   | Media | Alto    | Renderer único y scroll determinista (RF3.1 y RF3.3)                              |
| Pérdida de datos por limpieza de almacenamiento del navegador | Media | Medio   | Respaldo `.lyricsync.json`, `storage.persist()`, avisos                           |
| Consumo de memoria con audios largos                          | Media | Medio   | Límite de decodificación y modo streaming                                         |
| Rechazo de plataformas por copyright (audio silenciado)       | Media | Medio   | Aviso legal, guía de uso, no promover material sin derechos                       |
| Rendimiento del export en equipos modestos                    | Media | Medio   | 30 fps por defecto, opción 720×1280, cancelación y progreso                       |
| Complejidad de Safari (audio, codecs, almacenamiento)         | Alta  | Medio   | Nivel 2 declarado; pruebas tempranas y feature detection                          |


---



## 13. Roadmap por prototipos



### Prototipo 1 — Rebanada vertical (núcleo de sincronización)

**Objetivo:** validar que sincronizar se siente bien y el `.lrc` sale correcto.

- Estructura `Project`/`LyricLine[]` y parser de texto plano.
- Reproductor con `AudioContext`, atajos (`K`, `J`, `L`), cuenta regresiva.
- Tapper con `Espacio`, deshacer (`Backspace`), saltar (`S`) y silencio (`B`).
- Calibración de latencia y `tapOffsetMs`.
- Visor 9:16 en Canvas con **un solo fondo** y `renderFrame` compartible.
- Exportación `.lrc` e importación `.lrc`.
- Autoguardado en IndexedDB (incluido el audio).

**Criterio de salida:** una canción de 3 min sincronizada de principio a fin en ≤ 10 min por alguien que no conoce la herramienta, sin perder progreso tras recargar.

### Prototipo 2 — Refinamiento y estética

- Tabla de ajuste fino (±50/±100 ms, desplazamiento global, re-grabación).
- Waveform con marcadores y clic para seek.
- Metadatos y portada (`music-metadata`).
- Fondos por carátula y gradientes predefinidos, con contraste garantizado.
- Respaldo `.lyricsync.json`, lista de proyectos, i18n es/en.

**Criterio de salida:** el usuario corrige los desajustes de una canción completa en ≤ 5 min y la preview se ve pulida.

### Prototipo 3 — Exportación de video

- Pipeline WebCodecs en Worker (MP4, 30 fps, 1080×1920).
- Selector de rango, progreso y cancelación.
- Fallback `MediaRecorder` con avisos.
- Ajustes 720×1280 y 60 fps opcional.

**Criterio de salida:** clip de 30 s exportado en ≤ 30 s, con 0 frames perdidos, verificado en Instagram/TikTok y en la matriz de navegadores.

### Post-MVP (backlog priorizado)

1. Sincronización por palabra (karaoke) y `.lrc` extendido.
2. Auto-alineación asistida con un modelo local (p. ej. Whisper en el navegador) para generar marcas iniciales.
3. Fuentes personalizadas (`.woff2`), grano, viñeta y efectos de texto.
4. Soporte táctil y móvil (botón TAP grande).
5. Plantillas de estilo compartibles (JSON).
6. Exportación de secuencia PNG como alternativa.

---



## 14. Definición de terminado (MVP)

- [ ] Los tres prototipos cumplen sus criterios de salida.
- [ ] Los KPIs de la sección 7 se cumplen en el set de pruebas.
- [ ] Matriz de navegadores ejecutada y documentada; limitaciones conocidas listadas en la UI.
- [ ] Sin solicitudes de red a terceros en tiempo de ejecución (verificado con DevTools).
- [ ] Textos de la UI en español e inglés.
- [ ] Aviso legal y guía de uso incluidos.

---



## 15. Puntos por verificar antes de comprometer alcance

1. Soporte actual de `VideoEncoder`/`AudioEncoder` en Firefox y Safari (según versión) para fijar el nivel de garantía.
2. Que el `.lrc` sea aceptado como formato de entrega por las distribuidoras o plataformas de letras objetivo.
3. Disponibilidad de nombre y marca para "LyricSync Studio" (dominio, registros de marca).
4. Licencias exactas de las fuentes elegidas para los presets.
5. Bitrate y perfil H.264 óptimos para que Instagram y TikTok no recompriman en exceso.

---



## Anexo A. Cambios principales respecto a v1


| Área                 | v1                                                   | v2                                                                                    |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Exportación de video | `MediaRecorder` en tiempo real como ruta principal   | WebCodecs + muxer MP4 en Worker (determinista); `MediaRecorder` solo como fallback    |
| Renderizado          | Visor en DOM + exportación en Canvas (dos renderers) | Un único `renderFrame` en Canvas para preview y export                                |
| Scroll               | Suavizado con `lerp` (con estado)                    | Función determinista de `t`                                                           |
| FPS                  | 60 fps de exportación                                | 30 fps por defecto; 60 opcional                                                       |
| Tiempo y tap         | `audio.currentTime`                                  | `AudioContext` + mapeo `event.timeStamp` + compensación de latencia + calibración     |
| Sync UX              | Sin deshacer, sin silencios, debounce 150 ms         | Deshacer, marcador de silencio, saltar, cuenta regresiva, debounce 70 ms configurable |
| Persistencia         | Letra + marcas                                       | Proyecto completo con audio, respaldo `.json`, avisos de cuota                        |
| Framework            | Next.js                                              | Vite + React                                                                          |
| Estado               | `currentTime` en el store                            | Tiempo fuera del store (ref/objeto mutable)                                           |
| Privacidad           | Google Fonts posible                                 | Fuentes autoalojadas                                                                  |
| KPIs                 | "Latencia 25 ms" (no medible)                        | KPIs medibles con método de verificación                                              |
| Alcance              | 4 fases con muchas funciones                         | 3 prototipos con criterios de salida; extras al backlog                               |
| Móvil                | Compatibilidad táctil prometida                      | Fuera del MVP, declarado explícitamente                                               |
| Legal                | No contemplado                                       | Aviso legal, sin branding de terceros, licencias de fuentes                           |


