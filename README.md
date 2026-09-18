# FERDEL Gestión

Aplicación de escritorio para inventarios, órdenes de trabajo y control de costos de FERDEL Perú S.A.C.

## Inicio rápido

Requiere Node.js 22 o superior.

```bash
npm install
npm run desktop:dev
```

Para compilar y abrir la versión de producción:

```bash
npm run build
npm run electron
```

## Funcionalidad incluida

- Dashboard ejecutivo con indicadores, alertas y gráficos.
- Inventario con creación, edición, eliminación y cálculo automático del estado de stock.
- Movimientos de entrada/salida y trazabilidad.
- Órdenes de trabajo editables por bus.
- Costos de materiales, mano de obra, adicionales, ganancia y margen.
- Directorios de clientes y proveedores.
- Centro de reportes y gestión de usuarios.
- Persistencia PostgreSQL central con autenticación y políticas de seguridad por usuario.
- SQLite/localStorage disponible únicamente como respaldo cuando el servidor central no está configurado.

## Configuración de la base central

1. Crea el proyecto de base de datos central.
2. Abre el editor SQL del servicio y ejecuta [`supabase/schema.sql`](supabase/schema.sql).
3. En **Authentication > Users**, crea el primer usuario.
4. Copia `.env.example` como `.env.local` y completa la URL y la clave pública del proyecto.
5. Ejecuta `npm run desktop:dev`.

Nunca coloques `service_role` ni una secret key en las variables `VITE_*`. La aplicación usa la clave pública y protege los datos mediante autenticación y políticas RLS.

Si la opción de datos demostrativos está activa, la aplicación cargará registros de ejemplo cuando productos y órdenes estén vacíos. Para producción debe permanecer desactivada.

## Identidad visual

El adjunto recibido no contenía el archivo del logo oficial. La interfaz utiliza temporalmente una marca tipográfica FERDEL. Para incorporar el logo oficial, agréguelo al proyecto en `public/` y sustituya el componente `Brand` de `src/App.tsx`.

## Actualizaciones automáticas

La versión 1.2.0 incorpora búsqueda, descarga e instalación de actualizaciones mediante GitHub Releases. Consulta [`ACTUALIZACIONES.md`](ACTUALIZACIONES.md) para configurar GitHub Actions y publicar nuevas versiones.

## Acceso móvil

El botón **Acceso móvil** genera un QR hacia la aplicación publicada en GitHub Pages. Funciona aunque el celular use datos móviles y la computadora esté en otra red. Consulta [`ACCESO-MOVIL.md`](ACCESO-MOVIL.md).
