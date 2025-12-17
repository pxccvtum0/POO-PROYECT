import  * as readline from 'readline';

// --- INTERFACES Y TIPOS ---
type EstadoCupo = "PENDIENTE" | "ACEPTADO" | "RECHAZADO";

/**
 * [PRINCIPIO: Interface Segregation (I)]
 * Creamos una interfaz específica para las carreras. 
 * Así las clases no dependen de objetos genéricos, sino de contratos claros.
 */
interface ICarrera {
    nombre: string;
    cupos: number;
    minPuntaje: number;
}

/**
 * [Patrón Observer (Comportamiento)(Interfaz)]
 * Define el contrato para cualquier objeto que quiera "escuchar" cambios en el sistema.
 */
interface Observer {
    update(nombre: string, estado: EstadoCupo): void;
}

/**
 * [Patrón Observer (Comportamiento) (Implementación)]
 * [PRINCIPIO: Single Responsibility (S)]
 * Esta clase solo tiene la tarea de notificar por consola. 
 * Si quisiéramos enviar un SMS, crearíamos otro Observer.
 */
class NotificadorAdmin implements Observer {
    update(nombre: string, estado: EstadoCupo): void {
        console.log(`\n NOTIFICACIÓN: El aspirante ${nombre} ha cambiado su estado a: ${estado}`);
    }
}

/**
 * [PRINCIPIO: Single Responsibility (S)]
 * La clase Aspirante solo se encarga de almacenar los datos del estudiante.
 */
class Aspirante {
    public carreraAsignada: string | null = null;
    public estadoCupo: EstadoCupo = "PENDIENTE";

    constructor(
        public nombre: string,
        public apellido: string,
        public cedula: string,
        public puntaje: number,
        public carreraDeseada: string
    ) {}
}

/**
 * Patrón Singleton (Creacional)
 * Garantiza que solo exista una única base de datos (instancia) en todo el programa.
 * [PRINCIPIO: Single Responsibility (S)]
 * Su única tarea es gestionar el almacenamiento de los aspirantes.
 */
class AspiranteRepository {
    private static instance: AspiranteRepository;
    private aspirantes: Map<string, Aspirante> = new Map();

    private constructor() {} // Constructor privado para evitar 'new' externo

    public static getInstance(): AspiranteRepository {
        if (!AspiranteRepository.instance) {
            AspiranteRepository.instance = new AspiranteRepository();
        }
        return AspiranteRepository.instance;
    }

    registrar(a: Aspirante): void { this.aspirantes.set(a.cedula, a); }
    obtenerTodos(): Aspirante[] { return Array.from(this.aspirantes.values()); }
}

/**
 * Patrón Adapter (Estructural)
 * Actúa como un intermediario para validar la lógica de negocio. 
 * [PRINCIPIO: Open/Closed (O)]
 * Si las reglas de ingreso cambian (ej. sumar puntos extra), solo modificamos 
 * el Adaptador sin tocar el resto del sistema.
 */
class ValidadorAdapter {
    static validar(aspirante: Aspirante, carrera: ICarrera): boolean {
        if (aspirante.puntaje < carrera.minPuntaje) {
            console.log(`\n ERROR: Puntaje insuficiente (${aspirante.puntaje} < ${carrera.minPuntaje})`);
            return false;
        }
        if (carrera.cupos <= 0) {
            console.log(`\n ERROR: Sin cupos en ${carrera.nombre}`);
            return false;
        }
        return true;
    }
}

/**
 * [Patrón Adapter (Estructural) (Sujeto)]
 * Mantiene una lista de observadores y les avisa.
 * [PRINCIPIO: Dependency Inversion (D)]
 * El servicio no depende de una clase "Notificador" específica, 
 * sino de la interfaz abstracta 'Observer'.
 */
class AsignacionService {
    private observadores: Observer[] = [];
    
    // [PRINCIPIO: Liskov Substitution (L)]
    // El código funciona con cualquier objeto que cumpla la interfaz ICarrera.
    public carreras: Record<string, ICarrera> = {
        "INGENIERÍA CIVIL": { nombre: "INGENIERÍA CIVIL", cupos: 100, minPuntaje: 80 },
        "MEDICINA": { nombre: "MEDICINA", cupos: 50, minPuntaje: 90 },
        "DERECHO": { nombre: "DERECHO", cupos: 120, minPuntaje: 85 }
    };

    agregarObservador(o: Observer) { this.observadores.push(o); }

    private notificar(nombre: string, estado: EstadoCupo) {
        this.observadores.forEach(o => o.update(nombre, estado));
    }

    procesarEstado(aspirante: Aspirante, nuevoEstado: EstadoCupo, nombreCarrera?: string): void {
        if (nuevoEstado === "ACEPTADO" && nombreCarrera) {
            const carrera = this.carreras[nombreCarrera.toUpperCase()];
            // Usamos el Adaptador para validar
            if (carrera && ValidadorAdapter.validar(aspirante, carrera)) {
                aspirante.carreraAsignada = carrera.nombre;
                aspirante.estadoCupo = "ACEPTADO";
                carrera.cupos--;
            }
        } else {
            aspirante.estadoCupo = nuevoEstado;
            aspirante.carreraAsignada = null;
        }
        // Notificamos a los interesados mediante el patrón Observer
        this.notificar(aspirante.nombre, aspirante.estadoCupo);
    }
}

// --- MENÚ PRINCIPAL ---
async function main() {
    // Obtenemos la instancia única (Singleton)
    const repo = AspiranteRepository.getInstance(); 
    const service = new AsignacionService();
    
    // Suscribimos un observador
    service.agregarObservador(new NotificadorAdmin()); 

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const input = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

    // Seed Data
    repo.registrar(new Aspirante("Jover", "Moreira", "1301", 95, "MEDICINA"));
    repo.registrar(new Aspirante("Kevin", "Pinkay", "1302", 75, "DERECHO"));

    let continuar = true;
    while (continuar) {
        console.log("\n=== ULEAM: SOLID + PATRONES ===");
        console.log("1. Ver Lista\n2. Gestionar Estado\n3. Salir");
        const opt = await input("Opción: ");

        if (opt === "1") {
            repo.obtenerTodos().forEach(a => console.log(`${a.nombre} - ${a.estadoCupo} - Puntaje: ${a.puntaje}`));
        } else if (opt === "2") {
            const lista = repo.obtenerTodos();
            lista.forEach((a, i) => console.log(`${i + 1}. ${a.nombre}`));
            const sel = parseInt(await input("Seleccione #: ")) - 1;
            
            if (lista[sel]) {
                const acc = await input("[1] Aceptar [2] Rechazar [3] Pendiente: ");
                if (acc === "1") {
                    const car = await input(`Asignar carrera (${lista[sel].carreraDeseada}): `);
                    service.procesarEstado(lista[sel], "ACEPTADO", car);
                } else {
                    service.procesarEstado(lista[sel], acc === "2" ? "RECHAZADO" : "PENDIENTE");
                }
            }
        } else if (opt === "3") {
            continuar = false;
            rl.close();
        }
    }
}

main();
