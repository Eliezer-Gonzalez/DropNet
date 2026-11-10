# DropNet

![Windows](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Rust](https://img.shields.io/badge/backend-Rust-DEA584?logo=rust&logoColor=black)
![Version](https://img.shields.io/badge/version-0.3.2-blue)
![GPL-3.0-only](https://img.shields.io/badge/license-GPL--3.0--only-blue)

**A small Windows utility for one job: block or restore internet access for a selected executable.**

I made this personal tool to test programs I build without disconnecting the rest of my computer from the internet. It is intentionally limited in scope; it does not try to manage bandwidth, inspect traffic, or replace a general firewall manager.

## What it does

- Lists running processes in a parent/child tree and lets you choose an executable.
- Sorts process names, PIDs, and network status from the column headings while keeping parent/child groups intact.
- Adds Windows Defender Firewall block rules for that executable in both inbound and outbound directions, or removes DropNet's rules to restore access.
- Uses the executable path as the rule target. Child processes using the same .exe are covered by that rule; a child using a different .exe needs its own rule.
- Checks Firewall state instead of treating the saved process list as proof that a block is active.
- Tries to remove saved DropNet rules when the app starts after an unexpected shutdown. Windows may keep rules active until DropNet starts again.
- Keeps local diagnostic logs, rotates old log files, and includes a small in-app log viewer.

DropNet does **not** disconnect the whole computer, install a driver, filter folders or wildcards, or automatically block child processes that use a different .exe.

## Important behavior

- **Administrator permissions are required to change Windows Firewall rules.** For development, open the terminal as administrator before starting DropNet.
- Blocking can affect traffic immediately, including traffic from a program that is already open. Content already downloaded or cached may remain visible, while later requests can fail. Restart the target program when you want to test from a clean state.
- If DropNet or Windows stops unexpectedly, Windows Firewall can keep the rules. Start DropNet again so it can attempt recovery, or remove the rules from DropNet.
- Blocking an executable affects every process instance using that exact .exe path, including child processes that use the same executable. A child process running a different .exe is a separate target.
- This is a personal testing utility, not a security boundary or a replacement for Windows Firewall management.

## Build from source

DropNet is a Windows-only Tauri 2 application with a React, TypeScript, Vite, and Tailwind frontend and a Rust backend.

1. Install Node.js, pnpm, Rust, and the Windows build prerequisites for Tauri.
2. Clone this repository.
3. From the project directory, run:

       pnpm install
       pnpm tauri dev

   Run the terminal as administrator if you want to change Firewall rules.

To create a release bundle:

    pnpm tauri build

## Logs and privacy

Use **Logs / Registros** inside the app to review recent diagnostic entries. DropNet stores logs locally in its application log directory, keeps a bounded set of rotated files, and redacts absolute Windows paths in log messages. Error details can still include information about the operation; review the logs before sharing them.

## License

DropNet is distributed under **GNU General Public License v3.0 only (GPL-3.0-only)**. The complete license text is included in [LICENSE](LICENSE). See the [GNU Project](https://www.gnu.org/licenses/gpl-3.0.html) for license information.

Copyright © 2026 DestGM.

---

# DropNet (español)

**Una pequeña herramienta para Windows que hace una sola tarea: bloquear o restablecer el acceso a internet de un ejecutable seleccionado.**

Hice esta herramienta personal para probar los programas que desarrollo sin desconectar de internet al resto del computador. Su alcance es deliberadamente acotado: no administra el ancho de banda, no inspecciona el tráfico y no reemplaza un administrador general del Firewall.

## Qué hace

- Muestra los procesos en ejecución como un árbol de procesos padre e hijos para elegir un ejecutable.
- Permite ordenar los nombres, PID y estados desde los encabezados de las columnas sin separar los grupos padre e hijo.
- Crea reglas de bloqueo del Firewall de Windows Defender para el ejecutable seleccionado, tanto de entrada como de salida, o elimina las reglas de DropNet para restablecer el acceso.
- Usa la ruta del ejecutable como destino de la regla. Los procesos hijos que usan el mismo .exe quedan cubiertos por la regla; si un hijo usa otro .exe, hay que agregarlo por separado.
- Consulta el estado real del Firewall; la lista guardada no se considera prueba de que un bloqueo siga activo.
- Al iniciar después de un cierre inesperado, intenta quitar las reglas guardadas de DropNet. Windows puede conservarlas hasta que DropNet se vuelva a iniciar.
- Guarda registros de diagnóstico localmente, rota los archivos antiguos e incluye un visor dentro de la aplicación.

DropNet **no** desconecta todo el computador, no instala controladores, no filtra carpetas ni comodines, y no bloquea automáticamente los procesos hijos que usan otro .exe.

## Comportamiento importante

- **Se necesitan permisos de administrador para cambiar las reglas del Firewall de Windows.** Para desarrollo, abre la terminal como administrador antes de iniciar DropNet.
- El bloqueo puede afectar el tráfico de inmediato, incluso en un programa que ya está abierto. El contenido descargado o guardado en caché puede seguir visible, mientras que las solicitudes posteriores pueden fallar. Reinicia el programa si quieres probar desde un estado limpio.
- Si DropNet o Windows se detiene inesperadamente, Windows Firewall puede conservar las reglas. Inicia DropNet otra vez para que intente recuperarse, o quita las reglas desde DropNet.
- El bloqueo de un ejecutable afecta a todos los procesos que usan la misma ruta del .exe, incluidos los procesos hijos que ejecutan ese mismo archivo. Un proceso hijo que ejecuta otro .exe es un destino separado.
- Esta herramienta personal de pruebas no es una frontera de seguridad ni un reemplazo de la administración del Firewall de Windows.

## Compilar desde el código fuente

DropNet es una aplicación Tauri 2 exclusiva para Windows, con frontend React, TypeScript, Vite y Tailwind, y backend en Rust.

1. Instala Node.js, pnpm, Rust y los requisitos de compilación de Tauri para Windows.
2. Clona este repositorio.
3. Desde la carpeta del proyecto, ejecuta:

       pnpm install
       pnpm tauri dev

   Ejecuta la terminal como administrador si necesitas cambiar reglas del Firewall.

Para crear un instalador de distribución:

    pnpm tauri build

## Registros y privacidad

Usa **Logs / Registros** dentro de la aplicación para revisar las entradas recientes. DropNet guarda los registros localmente en su directorio de aplicación, conserva una cantidad limitada de archivos rotados y oculta las rutas absolutas de Windows en los mensajes. Los detalles de errores todavía pueden incluir información sobre la operación; revisa los registros antes de compartirlos.

## Licencia

DropNet se distribuye bajo la **Licencia Pública General de GNU, versión 3 únicamente (GPL-3.0-only)**. El texto completo de la licencia está incluido en [LICENSE](LICENSE). Consulta la información de la licencia en el [Proyecto GNU](https://www.gnu.org/licenses/gpl-3.0.html).

Copyright © 2026 DestGM.
