# Cronomat Organizer — demo

Demostración navegable del sistema de gestión de horarios académicos de
**CONAMAT, plantel Hidalgo – San Cosme**.

👉 **[Abrir la demo](https://itzelgg9.github.io/cronomat-demo/)**

Se entra con usuario y contraseña, igual que en el sistema real: quién eres lo
determina la cuenta con la que inicias sesión, no un selector.

La contraseña de todas las cuentas de muestra es **`demo`**.

| Usuario | Rol | Qué ve |
|---|---|---|
| `admin` | Administrador | Todo: cursos, materias, profesores, grupos y el calendario completo por plantel |
| `control.hidalgo` | Control escolar | Solo consulta, y únicamente los horarios del plantel Hidalgo |
| `control.sancosme` | Control escolar | Lo mismo, pero del plantel San Cosme |
| `profesor1` | Profesor | Su horario semanal — carga alta |
| `profesor2` | Profesor | Su horario semanal — carga baja |

Hay dos profesores a propósito: uno con la semana llena y otro con muy pocas
clases, para ver cómo se comporta el calendario en ambos casos.

En la pantalla de acceso están listadas: al hacer clic en una, entra directo.

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

## Se puede usar, no solo mirar

Entrando como `admin` puedes **programar clases** haciendo clic en el calendario,
borrarlas, y dar de alta cursos, materias, grupos y profesores. Se aplican las
mismas reglas que en el sistema real:

- Un profesor no puede tener dos clases a la misma hora
- Un grupo tampoco, salvo que sean dos áreas propedéuticas distintas
- La hora de fin tiene que ser posterior a la de inicio
- El correo y el celular de un profesor se validan al capturarlos

Los cambios se guardan **en tu propio navegador**: son solo tuyos, nadie más los
ve, y con el botón *Restablecer* de la esquina vuelve todo a como estaba.
