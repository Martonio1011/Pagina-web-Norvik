# Conectar un dominio propio a Norvik (norviik.myshopify.com)

Guía operativa para pasar de `norviik.myshopify.com` a un dominio propio. Datos de partida: tienda **Norvik**, plan **Basic**, moneda **USD**, fiscalidad **España**, zona horaria **Europe/Madrid**.

> **Aviso sobre disponibilidad real de `norvik.com`**: no he podido consultar en tiempo real si está libre — el entorno desde el que escribo esta guía no tiene salida a webs de comprobación de dominios (WHOIS/RDAP), así que no voy a inventar un resultado. Compruébalo tú en 30 segundos antes de decidir nada:
>
> 1. Entra en tu admin de Shopify → **Configuración → Dominios → Comprar nuevo dominio**
> 2. Escribe `norvik.com` y pulsa buscar
> 3. Shopify te dirá al instante si está libre y, si no lo está, te sugiere variantes
>
> Esto no te compromete a comprarlo ahí — es solo el buscador más rápido que tienes a mano, y consulta el registro real. Con el resultado, sigue la sección 2 (vía A o vía B). Más abajo tienes ya preparadas 5 alternativas por si `norvik.com` está ocupado.

---

## 1. Elección del dominio

### `.com` vs `.es` vs `.shop` vendiendo desde España

| Extensión | Cuándo conviene | Por qué |
|---|---|---|
| **.com** | Casi siempre, es la opción por defecto | Es la extensión que el cliente teclea de memoria sin pensar. Máxima confianza percibida, válida si algún día vendes fuera de España. Es la prioridad número 1 para Norvik. |
| **.es** | Si vendes solo o mayoritariamente en España y quieres reforzar "marca local" | Transmite confianza a comprador español (SEPA, devoluciones, sensación de "empresa de aquí"). Registro más barato que .com. Défenderla es barata y recomendable aunque no la uses como principal. |
| **.shop / .store** | Solo como alternativa si `.com` y `.es` no están libres | Extensiones nuevas (gTLD), funcionan bien pero un % de usuarios todavía desconfía un poco o las teclea mal. Úsalas como plan C, no como principal. |

**Recomendación para Norvik**: `.com` como dominio principal. Registra también `.es` aunque no la vayas a usar como canónica — la apuntas en redirección 301 hacia el `.com` (o la dejas parkeada) solo para que nadie más la registre y confunda a tus clientes.

### Errores de naming a evitar

- **Guiones**: nada de `norvik-tienda.com`. Son difíciles de dictar de palabra y de teclear en móvil, y en registros de marca es peor.
- **Plurales o variantes fonéticas confusas**: evita `norviks.com`, `norvic.com` (con c), etc. como dominio *principal* — regístralos solo como defensa si el presupuesto lo permite.
- **Typosquatting de tu propia marca**: alguien puede registrar `norvik-shop.com` o `norvick.com` y hacerse pasar por ti, o simplemente quedarse con tráfico de gente que teclea mal. No hace falta comprar 15 variantes, pero sí las 2-3 más obvias.
- **No mezcles el nombre con palabras genéricas del nicho** (`norvikmoda.com`, `norvikfashion.com`) salvo que sea defensivo: diluyen la marca y no se recuerdan igual.

### La trampa del "norviik" con doble i

Tu subdominio técnico es `norviik.myshopify.com` (con doble **i**), casi seguro porque `norvik.myshopify.com` ya estaba cogido cuando creaste la tienda — es habitual en Shopify. Pero tu **marca real es "Norvik"**, con una sola i. Esto es clave para no confundir a nadie:

- **Dominio principal a registrar**: `norvik.com` (una sola i) — es el que coincide con tu marca, tu logo, tus redes sociales y lo que la gente va a buscar en Google.
- **Regístralo también como redirección de defensa, si el presupuesto lo permite**: `norviik.com` (con doble i, tal cual tu subdominio actual) — así, si alguien ve `norviik.myshopify.com` en un email antiguo o factura y prueba a añadirle `.com` a mano, no cae en manos de un desconocido.
- El subdominio `norviik.myshopify.com` en sí **no lo puedes cambiar de nombre** sin recrear la tienda — no es un problema, simplemente vive de fondo y no lo ve el cliente (sección 4 explica por qué se queda).

### 5 alternativas si `norvik.com` no está libre

En orden de prioridad, todas evitan guiones y son fáciles de dictar:

1. **norvik.es** — igual de correcta como principal si finalmente el `.com` no cae; muy fuerte para el mercado español.
2. **norviik.com** — tu naming técnico actual convertido en dominio; coherente si no consigues el de una sola i.
3. **wearnorvik.com** — "wear" es habitual en moda (Nike usa patrones similares), se lee bien, no necesita traducción.
4. **norvik.store** — extensión pensada para ecommerce, cada vez más reconocida.
5. **getnorvik.com** — patrón muy usado en marcas D2C anglosajonas, funciona igual en España.

---

## 2. Comprar el dominio — comparativa

### Vía A: comprar dentro de Shopify

**Ruta**: Admin de Shopify → **Configuración** → **Dominios** → **Comprar nuevo dominio**.

**Pasos exactos**:
1. Escribe el nombre deseado (sin `.com`, solo `norvik`) y pulsa **Buscar**.
2. Shopify muestra disponibilidad y precio por extensión (.com, .es, .shop...).
3. Pulsa **Comprar** sobre la extensión elegida.
4. Revisa los datos de contacto/facturación que pide Shopify (usa `noorviik@gmail.com` y tu dirección fiscal en España).
5. Confirma el pago (se carga a la misma forma de pago de tu suscripción Shopify).
6. Shopify conecta el dominio **automáticamente**: no tienes que tocar ningún DNS, el SSL se emite solo en minutos/horas.

**Qué incluye**: privacidad WHOIS activada por defecto, renovación automática activada por defecto, SSL automático, DNS ya apuntado sin que hagas nada.

**Precio aproximado** (orientativo, verifícalo en el buscador de Shopify en el momento de comprar — cambia con frecuencia):
- `.com`: ~15-20 $/año
- `.es`: ~15-20 $/año
- `.shop`: ~25-30 $/año (esta extensión suele ser más cara en cualquier proveedor)

**Ventaja real**: cero trabajo técnico, cero riesgo de errar un registro DNS. Para una tienda que ya tiene bastante entre manos (catálogo, pedidos, marketing), esto vale más de lo que parece.

### Vía B: comprar en un registrador externo

| Registrador | Recomendado para | Precio 1er año orientativo (.com) | Precio renovación orientativo |
|---|---|---|---|
| **Namecheap** | Mi recomendación por defecto: barato, panel claro, privacidad WHOIS gratis de por vida | ~8-10 $ | ~13-15 $ |
| **Cloudflare Registrar** | Si ya usas o vas a usar Cloudflare para otras cosas; vende **al precio de coste**, sin margen | ~9-10 $ | ~9-10 $ (casi no sube) |
| **IONOS** | Alternativa europea con soporte en español | ~1 €(gancho) | ~15-20 € |
| **GoDaddy** | Solo si ya lo usas para otra cosa — es el más caro en renovación y el más agresivo en upsells | ~1-12 $ (gancho) | ~20-25 $ |
| **Dinahosting** | Específico si priorizas el `.es` con soporte 100% en español y factura española | ~8-12 € (.es) | ~10-15 € (.es) |

**El truco del precio gancho**: Namecheap, IONOS y GoDaddy publicitan el primer año a un precio ridículo (a veces 1 €) para engancharte, y la **renovación** (año 2 en adelante) sube a precio normal, a veces el doble o el triple. Cloudflare es la excepción: no juega a eso, cobra literalmente lo que le cuesta el dominio al registro, ni un céntimo de margen — por eso su primer año y su renovación son casi el mismo precio.

**Qué activar sí o sí en cualquier registrador externo**:
- ✅ **Privacidad WHOIS** (a veces llamada "WHOIS Privacy" o "ID Protection") — sin esto, tu nombre, dirección y teléfono quedan públicos en la base de datos WHOIS mundial. En Namecheap y Cloudflare viene gratis; en GoDaddy e IONOS a veces hay que activarla o es de pago.
- ✅ **Bloqueo de transferencia** ("Transfer Lock" / "Domain Lock") — evita que alguien robe o mueva tu dominio a otra cuenta sin tu permiso.
- ✅ **Renovación automática** — si se te pasa la fecha, pierdes el dominio y alguien puede registrarlo en horas. Actívala y añade recordatorio también en tu propio calendario.

### Recomendación para tu caso (tienda nueva, plan Basic, España)

**Compra dentro de Shopify (vía A)** si tu prioridad es cero fricción técnica y no te preocupa pagar un poco más al año — encaja bien con alguien que está gestionando la tienda en solitario y no quiere tocar DNS.

**Compra en Namecheap (vía B)** si prefieres ahorrar unos euros al año y no te importa seguir el paso a paso de la sección 3 (10 minutos, una sola vez).

Con tu perfil actual (recién empezando, muchos frentes abiertos: catálogo, legal, marketing), mi consejo de experto es **vía A dentro de Shopify** — la diferencia de precio anual es pequeña comparada con el tiempo y el riesgo de un DNS mal configurado justo cuando más necesitas que la tienda esté siempre accesible.

**Coste total estimado**:

| | 1 año | 3 años |
|---|---|---|
| Vía A (Shopify, .com) | ~18 $ | ~54 $ |
| Vía B (Namecheap, .com, con gancho año 1) | ~9 $ | ~9 + 14 + 14 = ~37 $ |

La diferencia a 3 años son unos 15-17 $ — el precio de una hora de tu tiempo, aproximadamente.

---

## 3. Conectar el dominio a Shopify (caso: comprado en registrador externo)

Si compraste por la **vía A**, salta esta sección entera: queda conectado solo. Esto es solo para dominio comprado **fuera** de Shopify.

### Ruta en Shopify

Admin → **Configuración** → **Dominios** → **Conectar dominio existente** → escribe `norvik.com` → **Siguiente**. Shopify te mostrará en pantalla los valores exactos a introducir (pueden variar ligeramente según la cuenta, pero desde hace años son los siguientes de forma estable):

### Registros DNS que tienes que crear

| Tipo | Host / Nombre | Valor / Destino | TTL |
|---|---|---|---|
| **A** | `@` (dominio raíz, o vacío según el panel) | `23.227.38.65` | Automático o 3600 |
| **CNAME** | `www` | `shops.myshopify.com` | Automático o 3600 |

**Antes de crear estos dos**, borra en el panel DNS de tu registrador cualquiera de estos registros si ya existen (suelen venir puestos por defecto al comprar el dominio, apuntando a una "página de aparcamiento" del propio registrador):

- Cualquier registro **A** existente en `@` que no sea el de Shopify
- Cualquier registro **AAAA** en `@` (IPv6) — Shopify no lo usa, y si se queda uno viejo puede hacer que la mitad de las visitas vayan al sitio antiguo
- Cualquier **CNAME** existente en `www`
- Registros tipo **"Parking Page"**, **"URL Forwarding"** o **"Web Forwarding"** que el registrador active por defecto

### Por qué el raíz va con A y el www con CNAME

Es una regla del propio protocolo DNS, no un capricho de Shopify: el dominio raíz (`@`) tiene que convivir obligatoriamente con otros registros técnicos (SOA, NS) que identifican quién gestiona el dominio, y un **CNAME no puede coexistir con ningún otro registro en el mismo nombre** — por especificación, un CNAME tiene que ser el único registro de ese nombre. Por eso el raíz usa **A** (apunta directo a una IP) y solo un subdominio como `www`, que no tiene esa obligación, puede usar **CNAME** (apunta a otro nombre de dominio, no a una IP).

### Instrucciones por panel

**Namecheap** (Dashboard → Domain List → *Manage* junto a tu dominio → pestaña **Advanced DNS**):
1. Borra los registros que vengan por defecto (`CNAME Record` a `parkingpage.namecheap.com`, etc.)
2. **Add New Record** → tipo `A Record` → Host `@` → Value `23.227.38.65` → TTL `Automatic`
3. **Add New Record** → tipo `CNAME Record` → Host `www` → Value `shops.myshopify.com.` (con el punto final si te lo pide) → TTL `Automatic`
4. Guarda con el icono de check verde

**Cloudflare** (Dashboard → selecciona el dominio → **DNS** → **Records**):
1. Borra cualquier registro A/AAAA/CNAME que apunte a una página de aparcamiento
2. **Add record** → Type `A` → Name `@` (o `norvik.com`) → IPv4 address `23.227.38.65` → **Proxy status: DNS only (nube gris, no naranja)**
3. **Add record** → Type `CNAME` → Name `www` → Target `shops.myshopify.com` → **Proxy status: DNS only (nube gris)**
4. Save

**GoDaddy** (mi cuenta de GoDaddy → **Dominios** → tu dominio → **DNS** → **Administrar zonas DNS**):
1. Elimina el registro `A` que apunta a la Parked Page de GoDaddy y cualquier `CNAME` de `www` existente
2. **Añadir** → Tipo `A` → Nombre `@` → Valor `23.227.38.65` → TTL `1 hora`
3. **Añadir** → Tipo `CNAME` → Nombre `www` → Valor `shops.myshopify.com` → TTL `1 hora`
4. Guardar (GoDaddy a veces pide confirmar por email, revisa la bandeja)

### Cloudflare: proxy naranja o gris, y qué pasa con el SSL

**Ponlo siempre en gris ("DNS only"), nunca en naranja ("Proxied")** para estos dos registros. Si activas el proxy naranja:
- Shopify deja de ver la IP real de tu dominio (ve la de Cloudflare) y **no puede validar ni emitir su certificado SSL automático** — se queda colgado en "pendiente" indefinidamente.
- El checkout de Shopify puede romperse o dar errores intermitentes porque pasa por una capa extra que no está pensada para eso en el plan Basic.

Si en algún momento quieres aprovechar la protección/CDN de Cloudflare, es un proyecto aparte (requiere configuración específica tipo "Cloudflare for SaaS") — no lo actives por defecto pensando que es gratis y sin riesgo.

### Cuánto tarda la propagación y cómo comprobarla

Lo normal es que funcione entre **15 minutos y 4 horas**. El máximo teórico, si algún proveedor de internet tiene un DNS antiguo en caché, es **48 horas** — así lo dice oficialmente Shopify, pero en la práctica casi nunca se llega ahí.

Verifícalo desde tu terminal (o pídeme que lo compruebe yo si tienes esta app abierta):

```bash
# Comprueba el registro A del dominio raíz
dig norvik.com A +short
# Debe devolver: 23.227.38.65

# Comprueba el registro CNAME de www
dig www.norvik.com CNAME +short
# Debe devolver: shops.myshopify.com.

# Alternativa si no tienes dig (Windows/Mac básico)
nslookup norvik.com
nslookup www.norvik.com
```

Y de forma visual, sin terminal: entra en **https://www.whatsmydns.net**, escribe `norvik.com`, elige tipo `A`, y mira el mapa mundial — cuando la mayoría de puntos estén en verde con `23.227.38.65`, ya ha propagado donde importa.

---

## 4. Después de conectar

### Poner el dominio nuevo como principal

Admin → **Configuración** → **Dominios** → junto a `norvik.com` pulsa el menú **⋯** → **Establecer como dominio principal**.

Esto es crítico para SEO: a partir de ese momento, Shopify **redirige automáticamente con 301** (redirección permanente) tanto `norviik.myshopify.com` como cualquier otra variante conectada (`www.norvik.com`, `norvik.es` si la conectaste también) hacia una única versión canónica — evita que Google vea el mismo contenido en 3 URLs distintas y penalice o reparta el posicionamiento.

### Certificado SSL

Se emite **solo**, normalmente en menos de 1 hora tras la propagación DNS correcta. Lo ves en Configuración → Dominios, junto al dominio, como candado verde / "Certificado activo".

**Si se queda en "Pendiente" más de 48 horas**:
1. Repite la comprobación de `dig`/`whatsmydns.net` de la sección 3 — el 90% de las veces el problema es que el DNS aún no apunta bien, o quedó un registro AAAA/CNAME viejo sin borrar.
2. Si usas Cloudflare, confirma que el proxy está en gris, no naranja.
3. Si todo lo anterior está bien y sigue pendiente, contacta con soporte de Shopify (chat del admin) — a veces hay que forzar manualmente la re-emisión.

### Qué hacer con `norviik.myshopify.com`

**Se queda, no se borra, y no puedes borrarlo aunque quieras.** Es el identificador técnico interno de tu tienda en la infraestructura de Shopify (login del admin, APIs, checkout de respaldo). No es una URL que vaya a ver ningún cliente una vez configurada la redirección: en cuanto pongas `norvik.com` como principal, cualquiera que llegue a `norviik.myshopify.com` será redirigido automáticamente. Es exactamente el comportamiento que quieres, no una chapuza temporal.

### Email profesional (`hola@norvik.com`)

Shopify no ofrece buzones de correo — solo aloja tu tienda. Necesitas un servicio de correo aparte, con sus propios registros DNS (que conviven sin problema con los de Shopify porque son tipos de registro distintos: MX en vez de A/CNAME).

**Opción 1 — Google Workspace** (de pago, ~6-7 €/mes/usuario, la más robusta):
| Tipo | Host | Valor | Prioridad |
|---|---|---|---|
| MX | `@` | `smtp.google.com` | 1 |
| TXT (SPF) | `@` | `v=spf1 include:_spf.google.com ~all` | — |
| TXT (DKIM) | `google._domainkey` | *(clave única que te da Google al activar "Autenticar correo electrónico" en admin.google.com → Apps → Gmail)* | — |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hola@norvik.com` | — |

**Opción 2 — Zoho Mail** (gratis hasta 5 buzones, región Europa recomendada para España):
| Tipo | Host | Valor | Prioridad |
|---|---|---|---|
| MX | `@` | `mx.zoho.eu` | 10 |
| MX | `@` | `mx2.zoho.eu` | 20 |
| MX | `@` | `mx3.zoho.eu` | 50 |
| TXT (SPF) | `@` | `v=spf1 include:zoho.eu ~all` | — |
| TXT (DKIM) | *(lo indica Zoho al activarlo, normalmente algo como `zmail._domainkey`)* | *(clave única generada por Zoho)* | — |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hola@norvik.com` | — |

**Opción 3 — Reenvío simple del registrador** (gratis, sin buzón real): la mayoría de registradores (Namecheap incluido) ofrecen "Email Forwarding" gratuito: `hola@norvik.com` reenvía directo a tu Gmail actual (`noorviik@gmail.com`), sin poder enviar correos *desde* esa dirección. Vale para recibir, no para una imagen 100% profesional en tus envíos.

**Importante en cualquiera de las tres opciones**: el registro DKIM es único, lo genera cada proveedor al activar el servicio en su propio panel — cópialo literal desde ahí, no lo copies de esta guía porque aquí no puede haber un valor real. Añadir estos registros MX/TXT **no toca ni rompe** los registros A/CNAME de Shopify: son tipos distintos y conviven en la misma zona DNS sin conflicto.

### Actualizar el dominio en el resto de plataformas

Una vez el dominio esté conectado y con SSL activo, actualízalo en:

- **Google Search Console**: añade `norvik.com` como propiedad nueva (tipo "Dominio" verificando por DNS, o "Prefijo de URL" con `https://norvik.com`), y vuelve a enviar el sitemap (`https://norvik.com/sitemap.xml`).
- **Meta Business Suite**: Configuración del negocio → **Dominios de marca** → verificar `norvik.com` (necesario para catálogo de Instagram/Facebook Shop y para que el píxel atribuya bien las conversiones).
- **Google Merchant Center**: Configuración del negocio → Sitio web → actualiza la URL y vuelve a verificar y reclamar el nuevo dominio.
- **Google Analytics 4**: en el Data Stream de tu propiedad, cambia la URL del sitio web a `https://norvik.com`.
- **Redes sociales** (Instagram, TikTok, Facebook): actualiza el enlace de la bio/perfil al nuevo dominio en las 4 plataformas.

---

## 5. Checklist final y errores frecuentes

### Checklist en orden

- [ ] Comprobado si `norvik.com` está libre (Shopify → Dominios → Comprar nuevo dominio)
- [ ] Decidida vía de compra (Shopify o registrador externo)
- [ ] Dominio comprado, con privacidad WHOIS + bloqueo de transferencia + renovación automática activados
- [ ] (Solo vía externa) Registros A y CNAME antiguos borrados
- [ ] (Solo vía externa) Registro A creado: `@` → `23.227.38.65`
- [ ] (Solo vía externa) Registro CNAME creado: `www` → `shops.myshopify.com`
- [ ] (Solo Cloudflare) Proxy en gris ("DNS only"), no naranja
- [ ] Propagación verificada con `dig`/`nslookup` o whatsmydns.net
- [ ] Dominio conectado en Shopify (Configuración → Dominios)
- [ ] Certificado SSL activo (candado verde)
- [ ] Dominio nuevo marcado como **principal**
- [ ] Confirmado que `norviik.myshopify.com` redirige solo a `norvik.com`
- [ ] Email profesional configurado (Google Workspace / Zoho / reenvío) con MX + SPF + DKIM + DMARC
- [ ] Google Search Console actualizado + sitemap reenviado
- [ ] Meta Business Suite: dominio verificado
- [ ] Google Merchant Center actualizado
- [ ] Google Analytics 4 actualizado
- [ ] Redes sociales (Instagram, TikTok, Facebook) con el enlace nuevo

### 10 fallos más habituales

1. **Registro A viejo sin borrar, conviviendo con el nuevo** → el 50% de las visitas caen en la página de aparcamiento del registrador. Se detecta con `dig norvik.com A +short`: si devuelve más de una IP, hay conflicto.
2. **Registro AAAA (IPv6) olvidado** → mismo síntoma que el anterior, pero solo afecta a quien tiene IPv6 activo. `dig norvik.com AAAA +short` debería devolver vacío.
3. **CNAME de `www` apuntando aún a la web anterior o al registrador** → `www.norvik.com` no carga la tienda. Se detecta con `dig www.norvik.com CNAME +short`.
4. **Cloudflare con proxy naranja activado** → SSL eternamente "Pendiente". Revisa que el icono de la nube esté gris.
5. **Poner el dominio como principal antes de que el SSL esté activo** → error de "conexión no segura" temporal para los primeros visitantes. Espera al candado verde.
6. **TTL demasiado alto en registros antiguos** → la propagación tarda mucho más de lo normal. Si vas a cambiar DNS pronto, baja el TTL a 300-600 segundos un día antes.
7. **Olvidar renovar** → el dominio caduca, la tienda se cae de golpe, y a veces otra persona lo registra en horas. Confirma que la renovación automática está activada y con una tarjeta válida.
8. **DKIM copiado mal** (con o sin comillas de más, o con saltos de línea) → los emails de la tienda caen en spam. Cópialo literal desde el panel del proveedor de correo, sin tocarlo.
9. **Confundir `norvik.com` con `norviik.com`** al escribir el registro DNS o al configurar Meta/Google → verificaciones que fallan sin motivo aparente. Revisa letra a letra.
10. **No actualizar Google Merchant Center / Meta** tras el cambio → el catálogo de anuncios sigue apuntando al dominio viejo, y los anuncios dejan de convertir aunque la tienda funcione perfectamente.

### Plan de rollback si la tienda queda inaccesible

1. **No entres en pánico ni borres registros al azar** — la tienda sigue viva en `norviik.myshopify.com` pase lo que pase con el dominio nuevo; nunca pierdes acceso al admin.
2. En Shopify, ve a **Configuración → Dominios** y **desmarca el dominio nuevo como principal** (vuelve a dejarlo como `norviik.myshopify.com` mientras investigas) — esto restaura el acceso público inmediato.
3. Vuelve al panel DNS del registrador y compara registro por registro con la tabla de la sección 3 — el 95% de los cortes es un registro A o CNAME mal escrito o duplicado.
4. Corrige, espera 15-30 minutos, verifica con `dig` antes de volver a marcar el dominio como principal.
5. Si tras corregir el DNS sigue sin funcionar pasadas varias horas, contacta con el soporte de Shopify desde el admin (chat en vivo) — con los datos de este documento (IP, CNAME, capturas de `dig`) resuelven el caso mucho más rápido.
