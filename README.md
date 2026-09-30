# DB-Shield: Antivirus de Base de Datos

DB-Shield es un motor automatizado de escaneo y mitigación de amenazas en bases de datos con Arquitectura Hexagonal estricta.

## 🚀 Arranque Rápido (Docker)

El proyecto está diseñado para levantarse con un solo comando, con aislamiento de red total (frontend, backend, internal-db, y bds de prueba).

```bash
# Levantar el entorno completo (incluye las 2 bases de datos demo externas)
docker compose --profile demo up --build
```

**Usuarios por defecto (Demo):**
- **Administrador (DBA):** `admin` / `admin123` (Acceso total, depuración, restauración)
- **Usuario Regular:** (Debe ser creado por el DBA en el dashboard)

---

## 🏛️ Decisiones de Diseño

1. **Aislamiento en Docker**: El escáner (backend) corre en un entorno JRE mínimo. NUNCA lee binarios a disco, previendo ataques de malware en la propia herramienta.
2. **Bandera de Cuarentena (Convención)**: El aislamiento de amenazas usa *cuarentena lógica*. Las tablas del cliente deben contar con una columna booleana configurable (ej. `is_quarantined`). DB-Shield no guarda ni mueve filas a `internal-db` por cumplimiento normativo.
3. **Escáner BLOB en Memoria (Tika)**: Apache Tika procesa magic-bytes en fragmentos de memoria (InputStream) sin usar archivos temporales `File.createTempFile()`.
4. **Bitácora Inmutable (Chained Hashing)**: Inspirado en blockchain, cada acción en `audit_logs` encadena su SHA-256 con el hash anterior, garantizando resiliencia forense (RA-09, RA-07).
5. **Arquitectura Hexagonal**: La capa `domain` está sellada (garantizado vía `ArchUnit`). El Core no sabe qué es Spring, JPA o JDBC.

---

## 📍 Matriz de Trazabilidad (Requerimientos vs Código)

### Requerimientos Web (Frontend)
| Req | Descripción | Ubicación Frontend |
|---|---|---|
| **RW-01** | Login JWT y roles | `src/pages/Login.tsx`, `AuthContext.tsx` |
| **RW-02** | Gestión usuarios (DBA) | `src/pages/Dashboard.tsx` (En proceso) |
| **RW-03** | Dashboard de Salud | `src/pages/Dashboard.tsx` |
| **RW-04** | Consola de Escaneo | `src/pages/Scanner.tsx` (Fase 7 completada) |
| **RW-05** | Bóveda de Cuarentena | `src/pages/Quarantine.tsx` |
| **RW-06** | Restaurar / Depurar | `src/pages/Quarantine.tsx` (Botones DBA) |
| **RW-07** | Visor DAM en vivo | `src/pages/DamMonitor.tsx` |
| **RW-08** | Bitácora de acciones | `src/pages/AuditLog.tsx` |

### Requerimientos Backend (Motor)
| Req | Descripción | Ubicación Backend (Clase/Endpoint/Test) |
|---|---|---|
| **RA-01** | JDBC a Postgres/MySQL | `DynamicJdbcAdapter.java` |
| **RA-02** | Escáner BLOB en memoria | `TikaBlobScannerAdapter.java` |
| **RA-03** | Escáner metadatos (rápido)| `DynamicJdbcAdapter.extractTables/Columns` |
| **RA-04** | Auditoría AST (JSqlParser)| `JSqlParserAstAdapter.java` |
| **RA-05** | Cuarentena < 2 segundos | `DynamicJdbcAdapter.quarantineRecord` / `QuarantineTimeTest.java` |
| **RA-06** | Restauración lógica | `ThreatManageService.restoreThreat` |
| **RA-07** | DAM y catálogos en vivo | `DynamicDamAdapter.java` |
| **RA-08** | Filtrado por propietario | `ThreatManageService.listThreats` |
| **RA-09** | Depuración irreversible | `ThreatManageService.purgeThreat` (con pre-audit) |
| **RA-10** | Identidad internal-db | `JwtService.java`, `SecurityConfig.java` |

---

## 🧪 Pruebas
Ejecutar validaciones de arquitectura y tiempo de latencia:
```bash
cd backend
mvn test
```
*Garantiza que la capa de Dominio no importe bibliotecas de la Infraestructura y que el tiempo de cuarentena cumpla el SLA < 2s.*
