# Configurar Alertas de Telegram (PASO A PASO)

Estas instrucciones son para que recibas un mensaje en tu celular cada mañana con el resumen de noticias del día.

---

## PASO 1: Crear tu Bot de Telegram

1. Abre la app de **Telegram** en tu celular.
2. En la barra de búsqueda arriba, busca: **@BotFather**
3. Toca el contacto que dice **BotFather** (tiene un check azul ✅).
4. Toca el botón **"START"** o escribe `/start`.
5. Verás un menú de opciones. Toca **"/newbot"** o escribe `/newbot`.
6. BotFather te preguntará el nombre del bot. Escribe: `NQ Calendar Alerts`
7. Luego te pedirá un username (debe terminar en "bot"). Escribe algo como: `nqcalendar_tu nombre_bot` (ejemplo: `nqcalendar_sanjuan_bot`)
8. Si está disponible, BotFather te enviará un mensaje como este:

> Done! Congratulations on your new bot. You will find it at t.me/nqcalendar_sanjuan_bot
> Use this token to access the HTTP API:
> `123456789:ABCdefGHIjklMNOpqrSTUvwxyz`

9. **Copia ese token largo** (el que empieza con números y tiene dos puntos). Es muy importante.
10. Guárdalo en un bloc de notas o notas de tu celular.

---

## PASO 2: Obtener tu Chat ID

1. En Telegram, busca este bot: **@userinfobot**
2. Toca **START**.
3. El bot te responderá con algo como:

> 👤 Your user info:
> 🆔 ID: 123456789
> ...

4. **Copia el número de ID** (solo los números).

---

## PASO 3: Guardar los datos en GitHub Secrets

Ahora vamos a esconder tu token y tu chat ID de forma segura en tu repo de GitHub.

1. Ve a tu repo en GitHub: `https://github.com/sanjuan9682-code/nq-market-calendar`
2. Haz clic en la pestaña **Settings** (arriba).
3. En el menú lateral izquierdo, haz clic en **"Secrets and variables" → "Actions"**.
4. Haz clic en el botón verde **"New repository secret"**.
5. Crea el **primer secret**:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Secret:** pega el token que copiaste del BotFather
   - Haz clic en **"Add secret"**
6. Crea el **segundo secret**:
   - **Name:** `TELEGRAM_CHAT_ID`
   - **Secret:** pega el número de ID que te dio userinfobot
   - Haz clic en **"Add secret"**

---

## PASO 4: Probar que funciona

1. Ve a tu repo → pestaña **Actions**.
2. Haz clic en el workflow **"Update NQ Calendar"**.
3. Arriba a la derecha haz clic en **"Run workflow"** → **"Run workflow"**.
4. Espera 1 minuto a que termine.
5. Si hoy hay eventos de alto o medio impacto, ¡recibirás un mensaje en Telegram!

---

## ¿Qué recibirás en Telegram?

Cada vez que el calendario se actualice (automático cada 6h), si hay eventos relevantes ese día, recibirás un mensaje como este:

```
📅 NQ Calendar — Miércoles
Semana cargada para el NQ. Se esperan datos de PMI...

🔴 ALTO IMPACTO HOY:
• 08:30 ET → CPI m/m (Est: 0.3%)

🟡 MEDIO IMPACTO:
• 10:00 ET → ISM Manufacturing PMI

Abrir Calendario
```

---

## ¿Puedo enviarme mensajes a mí mismo?

Sí, pero es más complicado. El método del bot es más fácil y funciona perfecto. Solo recuerda:

- **NO compartas tu token con nadie.** Es como una contraseña.
- Si pierdes el token, vuelve a BotFather y escribe `/revoke` para generar uno nuevo.

---

## Si no recibes mensajes

1. Verifica que el workflow en **Actions** tenga una ✅ verde.
2. Asegúrate de que hoy haya eventos en el calendario (si no hay, no envía nada).
3. Revisa que los Secrets estén bien escritos (sin espacios, sin comillas).
4. En Telegram, busca tu bot por su username (ej: `@nqcalendar_sanjuan_bot`) y toca **START**. A veces los bots no envían mensajes hasta que el usuario los inicia.

---

¿Te quedó claro? Si te atoras en algún paso, dime exactamente en cuál.
