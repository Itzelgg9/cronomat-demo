# Cronomat Organizer — demo

Demostración navegable del sistema de gestión de horarios académicos de
**CONAMAT, plantel Hidalgo – San Cosme**.

👉 **[Abrir la demo](https://itzelgg9.github.io/cronomat-demo/)**

Con el selector de abajo puedes recorrer el sistema como cada tipo de usuario:

| Usuario | Qué ve |
|---|---|
| **Administrador** | Todo: cursos, materias, profesores, grupos y el calendario completo por plantel |
| **Control escolar** | Solo consulta, y únicamente los horarios de su plantel (hay uno de Hidalgo y otro de San Cosme) |
| **Profesor** | Solo su propio horario semanal |

## Sobre los datos

Los nombres de profesores y de grupos son **inventados**, y los datos de
contacto no existen (`000@gmail.com`, `0000000000`). Se conserva la estructura
real —cursos, planteles, duración y distribución de las clases— para que la
demostración tenga sentido, pero ninguna persona ni ningún grupo son reales.

## Qué es esto por dentro

Es la interfaz real del sistema. En vez de pedirle los datos a un servidor,
los toma de un archivo, aplicando las mismas reglas de permiso que aplica el
servidor de verdad: un profesor no puede ver los horarios de otro, y control
escolar no puede salirse de su plantel.

La demo es solo de consulta: no guarda cambios.
