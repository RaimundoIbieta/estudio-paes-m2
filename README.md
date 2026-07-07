# Preuniversitario PAES

Plataforma web **gratuita y de acceso masivo** para preparar la PAES: M1, M2, Competencia Lectora, Historia y Ciencias, y Ciencias.

**Sitio en vivo:** https://raimundoibieta.github.io/estudio-paes-m2/

## Características

- **Selector de prueba PAES** (M1, M2, CL, HCS, Ciencias)
- **Diagramas SVG** claros (no texto ASCII)
- **Contenido, ejercicios y ensayos** por prueba
- **Usuarios** con Supabase (opcional)
- **Superadmin:** `raimundoibieta@gmail.com`

## Pruebas disponibles

| Prueba | Estado | Preguntas | Tiempo |
|--------|--------|-----------|--------|
| M1 | ✅ Activa | 65 | 2h 20min |
| M2 | ✅ Activa | 55 | 2h 20min |
| Competencia Lectora | 🔜 Próximamente | 65 | 2h 30min |
| Historia y CS | 🔜 Próximamente | 65 | 2h |
| Ciencias | 🔜 Próximamente | 80 | 2h |

## Activar cuentas de usuario (Supabase — gratis)

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta `supabase/schema.sql`
3. En **Settings → API**, copia URL y `anon` key
4. Edita `js/config.js`:

```javascript
export const APP_CONFIG = {
  superadminEmail: 'raimundoibieta@gmail.com',
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU_ANON_KEY',
};
```

5. Sube los cambios a GitHub

Al registrarte con `raimundoibieta@gmail.com` tendrás acceso al **panel Admin**.

## Desarrollo local

```bash
python3 -m http.server 8080
# http://localhost:8080
```

## Estructura

```
data/
  tests.json          # Catálogo de pruebas PAES
  m1/                 # Contenido M1
  m2/                 # (usa data/content.json como fallback)
  cl/, hcs/, ciencias/
js/
  diagrams.js         # Figuras SVG
  auth.js             # Supabase
  test-context.js     # Prueba seleccionada
```

## Importar tu material M2

Tu zip `M2 PAES` contiene PDFs de geometría, álgebra, números, probabilidad y semanas 1–3. Para incorporarlos:

1. Libera espacio en disco
2. Convierte secciones a JSON en `data/m2/content.json` o pide ayuda para automatizar la extracción

## Publicar cambios

```bash
git add -A && git commit -m "Actualizar plataforma"
git push origin main
```

GitHub Pages se actualiza en ~1 minuto.

## Visión

Preuniversitario económico con contenido de calidad, ensayos cronometrados y seguimiento de avance — accesible para todos los estudiantes de Chile.
