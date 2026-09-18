# Acceso móvil mediante QR

## Acceso desde cualquier red

La aplicación móvil está publicada en:

`https://jroldanal29-ui.github.io/update-Ferdel/`

El QR de la versión 1.2.2 y posteriores utiliza esta dirección. El celular puede conectarse con datos móviles y la computadora puede estar en otra red Wi-Fi o incluso apagada. Ambos dispositivos consultan directamente la misma base central.

1. Abre FERDEL Gestión y presiona **Acceso móvil**.
2. Escanea el QR con la cámara del celular.
3. Inicia sesión con tu usuario del sistema.
4. En el navegador móvil puedes usar **Agregar a pantalla de inicio** para abrirlo como una aplicación.

GitHub Actions vuelve a publicar automáticamente la interfaz móvil cada vez que se actualiza la rama `main`.

## Alternativa en la misma red

1. Abre FERDEL Gestión en la computadora.
2. Presiona **Acceso móvil** en la barra superior.
3. Conecta el celular a la misma red Wi-Fi que la computadora.
4. Escanea el QR con la cámara del celular.
5. Inicia sesión con tu usuario del sistema.

La computadora sirve la interfaz móvil en el puerto `4173`. Si Windows pregunta por el Firewall, permite el acceso en **redes privadas**. La aplicación de escritorio debe permanecer abierta.

## Dominio personalizado opcional

Si más adelante cuentas con un dominio, puedes reemplazar GitHub Pages por una dirección como:

```env
VITE_MOBILE_APP_URL=https://gestion.ferdel.pe
```

Vuelve a crear el instalador con `npm.cmd run desktop:pack`. A partir de ese momento el QR utilizará la dirección pública y funcionará fuera de la red de la empresa.

## Seguridad

- El QR contiene únicamente la dirección de acceso; no contiene claves ni contraseñas.
- Cada usuario debe iniciar sesión mediante el servicio central de autenticación.
- La clave incluida en la interfaz es la clave pública y el acceso a datos sigue protegido mediante RLS.
