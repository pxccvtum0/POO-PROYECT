import * as readline from 'readline';

// ==========================================
// UNIDAD 2: HERENCIA Y POLIMORFISMO
// ==========================================

/**
 * [SUPERCLASE ABSTRACTA]
 * Define la abstracción base. Cumple con la Unidad 1 (Abstracción).
 */
abstract class Persona {
    // [ENCAPSULAMIENTO]: Atributo protegido accesible solo por herencia.
    protected _nombre: string;

    constructor(nombre: string) {
        this._nombre = nombre;
    }

    // [MÉTODOS GET/SET]: Encapsulamiento modular (Unidad 1).
    public get nombre(): string { return this._nombre; }
    
    /**
     * [POLIMORFISMO]: Método abstracto.
     * Obliga a las subclases a definir su propia identificación.
     */
    abstract obtenerIdentificacion(): string;
}

// ==========================================
// UNIDAD 1: FUNDAMENTOS DE POO
// ==========================================

/**
 * [SUBCLASE / HERENCIA SIMPLE]
 * 'Aspirante' hereda de 'Persona'. Relación "Es-Un".
 */
class Aspirante extends Persona {
    // [PROPIEDADES PRIVADAS]: Encapsulamiento estricto.
    private _id: number;
    private _puntaje: number;
    private _carreraDeseada: string;
    
    // [RELACIONES]: Propiedades de instancia.
    public grupos: number[];
    public carreraAsignada: string | null = null;
    public grupoAsignadoFinal: string | null = null;
    public estadoCupo: EstadoCupo = "PENDIENTE";

    /**
     * [CONSTRUCTOR]: Uso de super() para inicializar la superclase.
     */
    constructor(id: number, nombre: string, puntaje: number, carreraDeseada: string, grupos: number[], tieneTitulo: boolean = false) {
        super(nombre); // [HERENCIA]: Llama al constructor del padre.
        this._id = id;
        this._puntaje = puntaje;
        this._carreraDeseada = carreraDeseada;
        // Lógica: El grupo 7 es Población General. Si tiene título solo va al 7.
        this.grupos = tieneTitulo ? [7] : [...grupos, 7]; 
        this.grupos.sort((a, b) => a - b);
    }

    // [GETTERS]: Acceso controlado a propiedades privadas.
    public get id(): number { return this._id; }
    public get puntaje(): number { return this._puntaje; }
    public get carreraDeseada(): string { return this._carreraDeseada; }

    /**
     * [MÉTODO PARA LISTADO]: Muestra los nombres de los grupos a los que pertenece.
     */
    public obtenerNombresGrupos(): string {
        const nombres: Record<number, string> = {
            1: "Cuotas", 2: "Vulnerabilidad", 3: "Mérito", 4: "Otros", 
            5: "Pueblos", 6: "Régimen", 7: "General"
        };
        return this.grupos.map(g => nombres[g]).join(", ");
    }

    /**
     * [POLIMORFISMO CON CLASES ABSTRACTAS]: 
     */
    public obtenerIdentificacion(): string {
        return `ASP-2025-ID-${this._id}`;
    }
}

// ==========================================
// UNIDAD 3: PATRONES DE DISEÑO Y SOLID
// ==========================================

interface ICarrera {
    nombre: string;
    minPuntaje: number;
    segmentos: Map<number, number>;
}

interface IObserver {
    update(nombre: string, estado: EstadoCupo, detalle: string): void;
}

type EstadoCupo = "PENDIENTE" | "ACEPTADO" | "RECHAZADO";

/**
 * [PATRÓN CREACIONAL: Singleton]
 */
class AspiranteRepository {
    private static instance: AspiranteRepository;
    private aspirantes: Aspirante[] = [];

    private constructor() {}

    public static getInstance(): AspiranteRepository {
        if (!AspiranteRepository.instance) {
            AspiranteRepository.instance = new AspiranteRepository();
        }
        return AspiranteRepository.instance;
    }

    public registrar(a: Aspirante): void { this.aspirantes.push(a); }
    public obtenerTodos(): Aspirante[] { return this.aspirantes; }
}

/**
 * [PATRÓN ESTRUCTURAL: Adapter]
 */
class CupoValidatorAdapter {
    public static puedeAcceder(carrera: ICarrera, grupoId: number): boolean {
        const disponibles = carrera.segmentos.get(grupoId) || 0;
        return disponibles > 0;
    }
}

/**
 * [PATRÓN DE COMPORTAMIENTO: Observer]
 * [PRINCIPIO: Single Responsibility (S)]
 */
class NotificadorAdmin implements IObserver {
    public update(nombre: string, estado: EstadoCupo, detalle: string): void {
        console.log(`\n[OBSERVER] Notificación: ${nombre} -> ${estado}. ${detalle}`);
    }
}

/**
 * [PRINCIPIO: Open/Closed (O)]
 * [PRINCIPIO: Dependency Inversion (D)]
 */
class AsignacionService {
    private observadores: IObserver[] = [];
    public carreras: Map<string, ICarrera> = new Map();

    constructor() {
        this.configurarCarrera("MEDICINA", 10, 90);
        this.configurarCarrera("INGENIERIA", 15, 80);
    }

    public agregarObservador(o: IObserver) { this.observadores.push(o); }

    /**
     * [SOBRECARGA]: Simulación mediante parámetros opcionales.
     */
    private configurarCarrera(nombre: string, cupos: number, min: number = 70) {
        const segmentos = new Map<number, number>();
        segmentos.set(3, Math.floor(cupos * 0.30)); // 30% para Mérito
        segmentos.set(7, Math.floor(cupos * 0.70)); // 70% para General
        this.carreras.set(nombre.toUpperCase(), { nombre, minPuntaje: min, segmentos });
    }

    /**
     * [PRINCIPIO: Liskov Substitution (L)]
     */
    public ejecutarAsignacionAutomatica(aspirantes: Aspirante[]) {
        const ordenados = [...aspirantes].sort((a, b) => b.puntaje - a.puntaje);
        ordenados.forEach(asp => {
            const carrera = this.carreras.get(asp.carreraDeseada.toUpperCase());
            if (!carrera || asp.puntaje < carrera.minPuntaje) {
                asp.estadoCupo = "RECHAZADO";
                return;
            }
            for (const grupoId of asp.grupos) {
                if (CupoValidatorAdapter.puedeAcceder(carrera, grupoId)) {
                    const actual = carrera.segmentos.get(grupoId) || 0;
                    carrera.segmentos.set(grupoId, actual - 1);
                    asp.estadoCupo = "ACEPTADO";
                    asp.carreraAsignada = carrera.nombre;
                    asp.grupoAsignadoFinal = `Segmento-${grupoId}`;
                    break;
                }
            }
            if (asp.estadoCupo === "PENDIENTE") asp.estadoCupo = "RECHAZADO";
        });
    }

    public modificarManualmente(id: number, nuevoEstado: EstadoCupo, repo: AspiranteRepository) {
        const asp = repo.obtenerTodos().find(a => a.id === id);
        if (!asp) return "ID no encontrado.";

        const carrera = this.carreras.get(asp.carreraDeseada.toUpperCase());
        if (nuevoEstado === "ACEPTADO" && carrera) {
            asp.estadoCupo = "ACEPTADO";
            asp.carreraAsignada = carrera.nombre;
            asp.grupoAsignadoFinal = "ADMIN_FORZADO";
            this.notificar(asp, "Asignación manual confirmada");
            return "Estado: ACEPTADO.";
        }
        asp.estadoCupo = nuevoEstado;
        this.notificar(asp, "Cambio manual realizado");
        return "Estado actualizado.";
    }

    private notificar(asp: Aspirante, detalle: string) {
        this.observadores.forEach(o => o.update(asp.nombre, asp.estadoCupo, detalle));
    }
}

// ==========================================
// FUNCIONAMIENTO DEL SISTEMA (EJECUCIÓN)
// ==========================================
async function main() {
    const repo = AspiranteRepository.getInstance();
    const service = new AsignacionService();
    service.agregarObservador(new NotificadorAdmin());

    // [OBJETOS]: 20 Aspirantes con diferentes grupos asignados
    const bdFicticia = [
        new Aspirante(1, "Ana Garcia", 98, "MEDICINA", [3]),
        new Aspirante(2, "Luis Pincay", 85, "INGENIERIA", [2]),
        new Aspirante(3, "Maria Shuar", 92, "MEDICINA", [5]),
        new Aspirante(4, "Jose Zambrano", 70, "INGENIERIA", []),
        new Aspirante(5, "Kevin Meza", 95, "MEDICINA", [1]),
        new Aspirante(6, "Carla Vera", 88, "MEDICINA", [3]),
        new Aspirante(7, "Juan Castro", 99, "MEDICINA", [], true),
        new Aspirante(8, "Sofia Reyes", 91, "MEDICINA", [2]),
        new Aspirante(9, "Diego Luna", 82, "INGENIERIA", [6]),
        new Aspirante(10, "Elena Paz", 94, "MEDICINA", [4]),
        new Aspirante(11, "Roberto Solis", 89, "INGENIERIA", [3]),
        new Aspirante(12, "Lucia Fernandez", 93, "MEDICINA", [2]),
        new Aspirante(13, "Ricardo Palma", 81, "INGENIERIA", [5]),
        new Aspirante(14, "Marta Gomez", 75, "INGENIERIA", []),
        new Aspirante(15, "Andres Pico", 96, "MEDICINA", [3]),
        new Aspirante(16, "Paola Ruiz", 87, "INGENIERIA", [1]),
        new Aspirante(17, "Fernando Toro", 90, "MEDICINA", [6]),
        new Aspirante(18, "Diana Vite", 84, "INGENIERIA", [3]),
        new Aspirante(19, "Gabriel Moreira", 97, "MEDICINA", [3]),
        new Aspirante(20, "Ximena Loor", 79, "INGENIERIA", [2]),
    ];

    bdFicticia.forEach(e => repo.registrar(e));
    service.ejecutarAsignacionAutomatica(repo.obtenerTodos());

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> => new Promise(res => rl.question(q, res));

    let salir = false;
    while (!salir) {
        console.log("\n--- SISTEMA DE ADMISIÓN ULEAM 2025 ---");
        console.log("1. Ver Listado (Grupos, Puntajes y Estados)");
        console.log("2. Modificar Estado (Manual)");
        console.log("3. Salir");
        const op = await ask("Opcion: ");

        if (op === "1") {
            // [LISTADO MODIFICADO]: Ahora muestra los grupos a los que pertenece el aspirante
            console.table(repo.obtenerTodos().map(a => ({
                ID: a.obtenerIdentificacion(), 
                Nombre: a.nombre, 
                Pts: a.puntaje, 
                "Pertenece a Grupos": a.obtenerNombresGrupos(), // NUEVA COLUMNA SOLICITADA
                Estado: a.estadoCupo, 
                Asignada: a.carreraAsignada || "Ninguna",
                "Segmento Ganado": a.grupoAsignadoFinal || "N/A"
            })));
        } else if (op === "2") {
            const id = parseInt(await ask("ID: "));
            const est = await ask("1: ACEPTAR, 2: RECHAZAR: ");
            console.log(`>> ${service.modificarManualmente(id, est === "1" ? "ACEPTADO" : "RECHAZADO", repo)}`);
        } else if (op === "3") {
            salir = true;
        }
    }
    rl.close();
}

main();
##
