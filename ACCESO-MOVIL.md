# Acceso móvil mediante QR

## Uso inmediato en la misma red

1. Abre FERDEL Gestión en la computadora.
2. Presiona **Acceso móvil** en la barra superior.
3. Conecta el celular a la misma red Wi-Fi que la computadora.
4. Escanea el QR con la cámara del celular.
5. Inicia sesión con un usuario de Supabase.

La computadora sirve la interfaz móvil en el puerto `4173`. Si Windows pregunta por el Firewall, permite el acceso en **redes privadas**. La aplicación de escritorio debe permanecer abierta.

## Acceso desde cualquier lugar

Despliega el contenido compilado de `dist/` en un servicio HTTPS como Vercel, Netlify o Cloudflare Pages. Después agrega la dirección pública a `.env.local`:

```env
VITE_MOBILE_APP_URL=https://gestion.ferdel.pe
```

Vuelve a crear el instalador con `npm.cmd run desktop:pack`. A partir de ese momento el QR utilizará la dirección pública y funcionará fuera de la red de la empresa.

## Seguridad

- El QR contiene únicamente la dirección de acceso; no contiene claves ni contraseñas.
- Cada usuario debe iniciar sesión mediante Supabase Auth.
- La clave incluida en la interfaz es la clave pública y el acceso a datos sigue protegido mediante RLS.
