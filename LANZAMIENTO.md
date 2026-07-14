# 🚀 CREART.TECH — Checklist de lanzamiento

> Generado tras la auditoría de seguridad (julio 2026).
> Orden recomendado: completa cada fase antes de pasar a la siguiente.

---

## 📍 ESTADO ACTUAL (14-jul-2026) — Listo para deploy sandbox

### ✅ Lo que ya quedó listo (no requiere acción tuya)

| Área | Estado |
|------|--------|
| **Código frontend** | Build de producción pasa (`npm run build` → `dist/` fresco, ~10 s) |
| **Diseño renovado** | Identidad dark + cian aplicada a todo el sitio: hero, catálogo, club, galería, footer y las 7 páginas de producto |
| **Logo CE** | Integrado en navbar y footer (`public/images/logo-ce.png`) |
| **Contenido** | Textos alineados con crearttech.com: "Diseña, construye y usa tu controlador MIDI o sintetizador a tu manera", "Fábrica de tecnología musical", WAVO en el footer |
| **functions/** | `npm install` hecho — **0 vulnerabilidades** |
| **`.env`** | Existe, con `VITE_PAYPAL_MODE=sandbox` (correcto para la fase de pruebas) |
| **firebase.json** | Hosting → `dist/`, CSP endurecida, headers de seguridad, cache de assets |
| **Reglas Firestore** | Reservas solo escribibles por la Cloud Function (verificación server-side de PayPal) |
| **Limpieza** | `server/` legacy eliminado; script `start-dev` roto removido de package.json |

### ⏳ Lo que TÚ tienes que resolver (en orden)

Todos requieren tus credenciales — nadie más puede hacerlos:

1. **Consola Firebase** (Fase 2, ~15 min):
   - Habilitar Email/Password y Google en Authentication
   - Agregar dominio final a Authorized domains
   - Restringir la API key por dominio en Google Cloud Console
2. **Secretos de la Cloud Function** (Fase 3, ~15 min):
   - `firebase functions:secrets:set` → PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE (sandbox)
   - App Password de Gmail → EMAIL_USER, EMAIL_PASS, EMAIL_TO
3. **Deploy de prueba** (Fase 4): `firebase deploy` + pago sandbox completo + verificar correo de aviso
4. **PayPal LIVE** (Fase 5): solo cuando la Fase 4 esté 100 % verificada
5. **Blindaje final** (Fase 6): App Check (`enforceAppCheck: true` en functions/index.js), alerta de presupuesto, dominio `creart.tech`

> El comando de deploy es `firebase deploy` (sube reglas + functions + hosting).
> El detalle paso a paso de cada fase está más abajo. ⬇️

---

## FASE 1 — Configuración local (5 min)

- [ ] Verifica que `.env` existe en la raíz con todas las variables
      (usa `.env.example` como plantilla — ahí está documentado qué es
      público y qué jamás debe ir en el frontend).
- [ ] Confirma que sigue en modo pruebas: `VITE_PAYPAL_MODE=sandbox`.

## FASE 2 — Consola de Firebase (15 min, una sola vez)

- [ ] **Authentication → Sign-in method**: habilita Email/Password y Google.
- [ ] **Authentication → Settings → Authorized domains**: agrega tu dominio
      final (ej. `creart.tech`) además de `creart-tech-752ff.web.app`.
- [ ] **Restricción de API key** (console.cloud.google.com → APIs & Services
      → Credentials → tu API key de navegador):
      - Application restrictions: **HTTP referrers**
      - Agrega: `creart.tech/*`, `www.creart.tech/*`,
        `creart-tech-752ff.web.app/*`, `creart-tech-752ff.firebaseapp.com/*`
      - Esto evita que otros sitios usen tu key (la key web es pública
        por diseño, pero así limitas su abuso de cuota).

## FASE 3 — Secretos en la Cloud Function (15 min)

Para pruebas (sandbox) — hazlo primero:

```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID   # pega el Client ID sandbox
firebase functions:secrets:set PAYPAL_SECRET      # pega el Secret sandbox
firebase functions:secrets:set PAYPAL_MODE        # escribe: sandbox
```

**Correo de aviso por cada reserva** (te llega con el cliente + la
configuración completa + los IDs de PayPal):

- [ ] Genera una **App Password** de Gmail con la cuenta
      creart.tech.col@gmail.com: entra a
      [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
      (requiere tener verificación en 2 pasos activa) y crea una para "CREART Reservas".
      ⚠️ NO es tu contraseña normal de Gmail — es una clave de 16 letras
      que Google genera para apps.

```bash
firebase functions:secrets:set EMAIL_USER   # creart.tech.col@gmail.com
firebase functions:secrets:set EMAIL_PASS   # la App Password de 16 letras
firebase functions:secrets:set EMAIL_TO     # a dónde llegan los avisos (puede ser el mismo)
```

## FASE 4 — Deploy de prueba (sandbox)

```bash
# 1. Instalar deps de functions (primera vez en esta máquina)
cd functions && npm install && cd ..

# 2. Build del frontend
npm run build

# 3. Subir TODO: reglas + función + hosting
firebase deploy
```

- [ ] Abre la web desplegada y revisa la consola del navegador:
      **no debe haber errores de CSP** (se endureció `script-src`).
- [ ] Haz un **pago de prueba completo** con una cuenta sandbox de PayPal
      (developer.paypal.com → Sandbox → Accounts).
- [ ] Verifica en Firestore que la reserva se creó con
      `pago.verificadoServidor: true` y `pago.modoPaypal: "sandbox"`.
- [ ] **Verifica que te llegó el correo de aviso** con el cliente, la
      configuración de colores y los IDs de PayPal (asunto empieza con 🧪
      en sandbox, ⚡ en live).
- [ ] Intenta escribir directo en `reservas` desde la consola del navegador
      — debe fallar con *permission denied* (reglas funcionando).
- [ ] Revisa logs de las funciones: `firebase functions:log`
- [ ] Repite el pago de prueba en al menos 2 configuradores distintos
      (ej. Beato16 y Wavo) — ahora TODOS tienen botón de reserva.

## FASE 5 — Activar dinero real (PayPal LIVE)

⚠️ Solo cuando la Fase 4 esté 100% verificada.

- [ ] En developer.paypal.com crea la app **Live** y copia Client ID + Secret
      (cuenta: creart.tech.col@gmail.com).
- [ ] Actualiza los secretos del servidor:

```bash
firebase functions:secrets:set PAYPAL_CLIENT_ID   # Client ID LIVE
firebase functions:secrets:set PAYPAL_SECRET      # Secret LIVE
firebase functions:secrets:set PAYPAL_MODE        # escribe: live
```

- [ ] Actualiza `.env` local:
      - `VITE_PAYPAL_CLIENT_ID=` (el Client ID LIVE)
      - `VITE_PAYPAL_MODE=live`
- [ ] Re-deploy: `npm run build && firebase deploy`
- [ ] **Prueba de fuego**: haz UN pago real de $50 con tu propia cuenta,
      verifica la reserva en Firestore (`modoPaypal: "live"`) y luego
      reembólsalo desde el dashboard de PayPal.

## FASE 6 — Blindaje final (recomendado, mismo día del lanzamiento)

- [ ] **App Check**: Firebase Console → App Check → registra la web app con
      reCAPTCHA Enterprise. Luego en `functions/index.js` cambia
      `enforceAppCheck: false` → `true` (busca el comentario TODO-LAUNCH)
      y re-deploya las functions. Con esto solo TU app puede llamar a la
      función de reservas (bloquea bots).
- [ ] **Presupuesto/alertas**: Google Cloud Console → Billing → crea una
      alerta de presupuesto (ej. $25 USD) para detectar abuso a tiempo.
- [ ] **Dominio**: Firebase Hosting → Add custom domain → `creart.tech`
      (los certificados HTTPS son automáticos).

---

## Qué quedó arreglado en la auditoría

| # | Hallazgo | Estado |
|---|----------|--------|
| 1 | Bug en reglas Firestore: la lectura del perfil de usuario fallaba (validación sobre `request.resource` en reads) | ✅ Corregido |
| 2 | La Cloud Function aceptaba cualquier objeto en `colores` (riesgo de datos basura ilimitados en Firestore) | ✅ Validación profunda con límites |
| 3 | CSP permitía `'unsafe-inline'` en scripts (debilitaba la defensa anti-XSS) | ✅ Eliminado; agregados dominios de functions y frame-ancestors |
| 4 | `functions/` sin lockfile y con vulnerabilidad moderada transitiva (uuid) | ✅ firebase-admin ^13.4 + override → **0 vulnerabilidades** |
| 5 | Servidor Express legacy con historial de issues podía desplegarse por error | ✅ Cuarentena documentada (no forma parte del deploy) |
| 6 | Sin plantilla de variables de entorno para nuevas máquinas | ✅ `.env.example` con documentación de seguridad |
| 7 | Pagos sandbox y live indistinguibles en Firestore | ✅ Campo `pago.modoPaypal` |
| 8 | Dependencias del frontend | ✅ `npm audit` producción: 0 vulnerabilidades |
| 9 | Solo el Beato 8 tenía botón de compra — los otros 6 configuradores lo ocultaban | ✅ Botón "Reservar" + modal de pago en los 7 configuradores |
| 10 | Nadie recibía aviso de las reservas nuevas | ✅ Cloud Function `enviarCorreoReserva`: correo automático con cliente + configuración + IDs de PayPal (con HTML escapado — sin inyección) |
| 11 | Backend Express legacy (PayU/Mongo/Gmail) con 4 fallos críticos señalados en code review: monto sin validar, webhook sin firma, `test:"1"` fijo, sin rate-limiting | ✅ **Eliminado por completo** (nada lo usaba; el flujo real es la Cloud Function). Recuperable desde git si algún día vuelve PayU |
| 12 | Código muerto de pagos en el frontend (apiService, usePayment, SecurePaymentModal, securePayment, paypalConfig, google-config) | ✅ Eliminado — menos superficie de ataque y de confusión |

### Verificado y ya estaba bien
- `.env` fuera de git (nunca commiteado) ✓
- Ningún secreto real en el código fuente ✓
- Flujo de pago server-side: el cliente no puede crear reservas sin pago
  verificado contra la API de PayPal (monto + moneda + estado + idempotencia) ✓
- Auth con Firebase (sin manejo manual de contraseñas) ✓
- Headers de seguridad: HSTS, nosniff, X-Frame-Options, Referrer-Policy ✓

---

## ⏳ Qué falta (requiere tus credenciales — no lo puedo hacer yo)

Estos son los puntos reales que quedan pendientes, con el curso de Platzi
que te da el contexto para hacerlos con criterio y no solo copiando pasos.

| # | Falta | Fase | Curso de Platzi recomendado |
|---|-------|------|------------------------------|
| 1 | Restringir la API key de Firebase por dominio (Google Cloud Console → Credentials) | 2 | [Gestión de Identidades y Accesos (IAM) en Google Cloud](https://platzi.com/cursos/fundamentos-google/identidad-y-control-de-acceso-iam/) — explica qué son las restricciones de credenciales y por qué importan |
| 2 | Configurar dominios autorizados en Firebase Authentication (quitar `localhost` al pasar a producción) | 2 | [Curso de Firebase 5 para Web](https://platzi.com/cursos/firebase-web/) — cubre Authentication end-to-end, incluida esta configuración |
| 3 | Probar el flujo de pago completo en sandbox y verificar que las reglas bloquean escritura directa | 4 | [Curso de Hacking: Aplicaciones Web Server Side](https://platzi.com/cursos/hacking-aplicaciones-web-server-side/) — te enseña a intentar romper tu propia app antes de que alguien más lo haga |
| 4 | Pasar a PayPal LIVE con cuidado (secretos nuevos + `.env` + prueba real reembolsable) | 5 | [Ciberseguridad para Desarrollo Web](https://platzi.com/cursos/software-seguro/) — el curso central que ya veníamos usando, cubre integraciones de pago con criterio de seguridad |
| 5 | Activar App Check (reCAPTCHA) y cambiar `enforceAppCheck: true` en `functions/index.js` | 6 | ⚠️ Platzi no tiene un curso dedicado a esto — usa la [documentación oficial de Firebase App Check](https://firebase.google.com/docs/app-check) directamente |
| 6 | Crear alerta de presupuesto en Google Cloud Billing | 6 | [Curso de Desarrollo y Despliegue en la Nube con GCP](https://platzi.com/cursos/desarrollo-despliegue-gcp/) — toca monitoreo y control de costos en la nube |
| 7 | Conectar el dominio `creart.tech` en Firebase Hosting | 6 | Cubierto dentro del mismo [Curso de Firebase 5 para Web](https://platzi.com/cursos/firebase-web/) (sección de Hosting) |

**Orden sugerido de estudio:** 2 → 1 → 3 → 4. El de IAM (#2 en la tabla,
Firebase para Web) y el de OWASP/hacking (#3) son los que más te van a
servir para entender *por qué* cada paso del checklist importa, no solo
*cómo* ejecutarlo. El de App Check (#5) no lo vas a encontrar en Platzi
como curso — es una feature muy específica de Firebase, así que ahí la
documentación oficial es la fuente correcta.
