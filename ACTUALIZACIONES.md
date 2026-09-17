# Publicación de actualizaciones con GitHub Releases

La aplicación consulta nuevas versiones en el repositorio público:

`https://github.com/jroldanal29-ui/update-Ferdel`

La versión 1.2.0 es la primera que utiliza GitHub como proveedor. Debe instalarse manualmente una vez. Las versiones posteriores podrán descargarse desde la ventana automática de la aplicación.

## Configuración inicial del repositorio

En GitHub abre **Settings > Secrets and variables > Actions** y crea estos secretos:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

La clave indicada debe ser la pública `sb_publishable_...`; nunca agregues una clave `service_role`.

En **Settings > Actions > General > Workflow permissions**, selecciona **Read and write permissions** para permitir que GitHub Actions cree releases.

## Publicar una actualización

1. Incrementa `version` en `package.json`; por ejemplo, de `1.2.0` a `1.2.1`.
2. Actualiza también la versión de respaldo mostrada en `src/App.tsx` y `electron/preload.cjs`.
3. Confirma y sube los cambios.
4. Crea y sube una etiqueta con el mismo número:

   ```powershell
   git tag v1.2.1
   git push origin main
   git push origin v1.2.1
   ```

El flujo `.github/workflows/release.yml` compilará Windows y creará automáticamente un GitHub Release con el instalador, `latest.yml` y el archivo `.blockmap`.

También puedes ejecutar manualmente el flujo desde **Actions > Publicar actualización > Run workflow**. Para que el actualizador detecte una versión nueva, el número de `package.json` debe ser superior al instalado.

## Flujo dentro de la aplicación

- Comprueba actualizaciones 8 segundos después de iniciar.
- Repite la comprobación cada 6 horas.
- Al encontrar una versión superior muestra “Hay una nueva actualización”.
- El usuario elige cuándo descargar.
- “Reiniciar e instalar” cierra la aplicación y ejecuta el instalador NSIS.

El actualizador debe probarse desde una aplicación instalada. En `desktop:dev` la instalación está desactivada para evitar actualizaciones accidentales.
