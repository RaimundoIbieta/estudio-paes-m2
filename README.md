# Estudio PAES M2

Aplicación web para preparar la **PAES de Matemática M2**: contenido teórico, ejercicios con corrección, ensayos cronometrados y seguimiento de progreso.

## Características

- **Contenido**: geometría, álgebra, números y probabilidad
- **Ejercicios**: alternativas con explicación inmediata
- **Ensayos**: simulacros con cronómetro
- **Progreso**: estadísticas guardadas en el navegador (localStorage)
- **Sin instalación**: funciona en cualquier navegador moderno

## Uso local

```bash
cd estudio-paes-m2
python3 -m http.server 8080
```

Abre [http://localhost:8080](http://localhost:8080)

> **Importante:** no abras `index.html` directamente con doble clic (los módulos JS no cargarán). Usa un servidor local o la versión publicada en web.

## Compartir con otras personas (recomendado)

Google Drive **no es ideal** para apps web (bloquea JavaScript al previsualizar). Para compartir un link que todos puedan usar:

### Opción A — GitHub Pages (gratis)

1. Crea un repositorio en GitHub y sube esta carpeta
2. Ve a **Settings → Pages → Source: main branch**
3. Comparte el link: `https://tu-usuario.github.io/estudio-paes-m2/`

### Opción B — Netlify Drop (gratis, sin cuenta)

1. Entra a [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Arrastra la carpeta `estudio-paes-m2`
3. Netlify te da un link público al instante

### Opción C — Google Drive (limitado)

Puedes subir la carpeta a Drive para **descargarla**, pero no para usarla como sitio web interactivo. Los demás deberán descargarla y ejecutar un servidor local.

## Estructura

```
estudio-paes-m2/
├── index.html
├── css/styles.css
├── js/
│   ├── app.js
│   ├── router.js
│   ├── storage.js
│   └── pages/
├── data/
│   ├── content.json      # Teoría
│   ├── exercises.json    # Preguntas
│   └── essays.json       # Ensayos
└── sw.js                 # Caché offline
```

## Agregar contenido

- **Nueva lección**: edita `data/content.json`
- **Nuevo ejercicio**: edita `data/exercises.json`
- **Nuevo ensayo**: edita `data/essays.json` (lista de IDs de preguntas)

## Relación con resumen Geometría

El contenido de geometría incorpora los temas del resumen LaTeX (`resumen-geometria-m2`), adaptados a formato web.

## Licencia

Uso educativo personal.
