// Nombres y apellidos frecuentes en el Perú, con apellidos típicos por región.
import type { Region } from "./places";

export const FEMALE_NAMES = [
  "María", "Rosa", "Carmen", "Ana María", "Lucía", "Patricia", "Milagros", "Karina", "Jessica", "Lizbeth",
  "Katherine", "Diana", "Claudia", "Fiorella", "Ximena", "Mariana", "Natalia", "Paola", "Rocío", "Silvia",
  "Elena", "Gianella", "Stephanie", "Yesenia", "Maricielo", "Brenda", "Nataly", "Pierina", "Flor de María", "Luz",
  "Susana", "Mónica", "Gloria", "Daniela", "Andrea", "Fernanda", "Gabriela", "Sofía", "Alejandra", "Valeria",
  "Camila", "Carolina", "Cecilia", "Verónica", "Pamela", "Vanessa", "Melissa", "Kiara", "Antonella", "Romina",
  "Jimena", "Lorena", "Giovanna", "Liliana", "Erika", "Janet", "Teresa", "Julia", "Martha", "Sandra",
  "Raquel", "Noemí", "Elizabeth", "Evelyn", "Roxana", "Maribel", "Yolanda", "Karen", "Johana", "Sheyla",
] as const;

export const MALE_NAMES = [
  "Jorge", "Luis", "Carlos", "José", "Juan Carlos", "Miguel", "Diego", "Sebastián", "Renato", "Álvaro",
  "Ricardo", "Kevin", "Christian", "Raúl", "Óscar", "Martín", "Julio", "César", "Fernando", "Gustavo",
  "Eduardo", "Javier", "Alonso", "Rodrigo", "Marco", "Piero", "Bruno", "Gonzalo", "Jesús", "Víctor",
  "Wilmer", "Edwin", "Franco", "Adrián", "Joaquín", "Daniel", "Alexander", "Josué", "Hugo", "Manuel",
  "Antonio", "Alberto", "Roberto", "Enrique", "Walter", "Iván", "Paolo", "Giancarlo", "Jean Pierre", "Anthony",
  "Bryan", "Erick", "Frank", "Percy", "Henry", "Elmer", "Hernán", "Jhonatan", "Luis Alberto", "Juan José",
] as const;

export const TEEN_FEMALE_NAMES = [
  "Nicole", "Ariana", "Valeria", "Camila", "Fernanda", "Alexa", "Brianna", "Mayte", "Danna", "Kiara",
  "Alondra", "Fátima", "Luciana", "Romina", "Sofía", "Ximena", "Abril", "Milagros",
] as const;

export const TEEN_MALE_NAMES = [
  "Diego", "Sebastián", "Fabián", "Rodrigo", "Adrián", "Jhair", "Santiago", "Gerson", "Joaquín", "Mathías",
  "Piero", "André", "Leonardo", "Bruno", "Gabriel", "Franco", "Alessandro", "Josué",
] as const;

export const CHILD_FEMALE_NAMES = [
  "Luana", "Isabella", "Ariana", "Valentina", "Mía", "Zoe", "Kiara", "Alessandra", "Camila", "Antonella",
  "Ximena", "Fernanda", "Abigail", "Danna", "Brianna", "Aitana", "Emma", "Luciana", "Renata", "Catalina",
] as const;

export const CHILD_MALE_NAMES = [
  "Mateo", "Thiago", "Gael", "Liam", "Santiago", "Valentino", "Dylan", "Sebastián", "Leonardo", "Adriano",
  "Joaquín", "Matías", "Ian", "Fabricio", "Alonso", "Benjamín", "Lucas", "Gabriel", "Rodrigo", "Facundo",
] as const;

export const COMMON_SURNAMES = [
  "Quispe", "Flores", "Rojas", "Sánchez", "García", "Rodríguez", "Chávez", "Ramírez", "Torres", "Mendoza",
  "Vargas", "Castillo", "Díaz", "Gutiérrez", "Espinoza", "Paredes", "Salazar", "Ruiz", "Ramos", "Vásquez",
  "Cárdenas", "Aguilar", "Medina", "Cruz", "Rivera", "Gonzales", "López", "Pérez", "Fernández", "Morales",
  "Romero", "Herrera", "Delgado", "Silva", "Reyes", "Campos", "Núñez", "Ortiz", "Vega", "León",
  "Ríos", "Palacios", "Soto", "Luna", "Alvarado", "Cabrera", "Huamán", "Castro", "Jiménez", "Muñoz",
  "Benites", "Ugarte", "Arévalo", "Solís", "Lozano", "Villanueva", "Tapia", "Carrasco", "Bustamante", "Calderón",
  "Saavedra", "Rosales", "Valencia", "Pinto", "Linares", "Arce", "Mejía", "Córdova", "Guerrero", "Peña",
  "Zapata", "Navarro", "Escobar", "Montes", "Cáceres", "Coronado", "Valdez", "Salinas", "Requena", "Bravo",
  "Poma", "Mamani", "Condori", "Huanca", "Chumpitaz", "Yupanqui", "Sotelo", "Matos", "Tello", "Loayza",
] as const;

export const REGIONAL_SURNAMES: Record<Region, readonly string[]> = {
  lima: ["Chumpitaz", "Yupanqui", "Sotelo", "Matos", "Tello", "Loayza", "Huapaya", "Bazán", "Manrique", "Carhuamaca"],
  arequipa: ["Zevallos", "Valdivia", "Begazo", "Bustamante", "Paz", "Cornejo", "Apaza", "Ticona", "Llerena", "Manrique", "Salas", "Medina"],
  trujillo: ["Gamarra", "Alva", "Briceño", "Cabanillas", "Castañeda", "Rebaza", "Asmat", "Ávila", "Zavaleta", "Rodríguez"],
  cusco: ["Huamán", "Quispe", "Ccori", "Puma", "Mamani", "Condori", "Hancco", "Huillca", "Cusi", "Zúñiga", "Farfán", "Choque"],
  piura: ["Seminario", "Chumacero", "Távara", "Zapata", "Sullón", "Chunga", "Vilela", "Silupú", "Purizaca", "Castillo"],
  chiclayo: ["Llontop", "Ynoñán", "Chafloque", "Damián", "Chapoñán", "Santamaría", "Purisaca", "Vidaurre", "Montenegro"],
  huancayo: ["Ricse", "Huaynate", "Lazo", "Meza", "Cóndor", "Orihuela", "Camarena", "Aliaga", "Vilcahuamán", "Poma"],
};

/** Pacientes migrantes (carné de extranjería): nombres y apellidos frecuentes en Venezuela. */
export const MIGRANT_FEMALE_NAMES = ["Yusmary", "Oriana", "Andreína", "Génesis", "Rosángela", "Mariangel", "Yoselin", "Daniela Alejandra"] as const;
export const MIGRANT_MALE_NAMES = ["Yorman", "José Gregorio", "Luis Alejandro", "Carlos Eduardo", "Jhonny", "Ender", "Wilmer José"] as const;
export const MIGRANT_SURNAMES = ["Rondón", "Briceño", "Contreras", "Hernández", "González", "Colmenares", "Urdaneta", "Rivas", "Méndez", "Marcano"] as const;

/** Ocupaciones de adultos: [masculino, femenino]. */
export const OCCUPATIONS: readonly (readonly [string, string])[] = [
  ["Docente", "Docente"],
  ["Ingeniero de sistemas", "Ingeniera de sistemas"],
  ["Contador", "Contadora"],
  ["Administrador", "Administradora"],
  ["Enfermero", "Enfermera"],
  ["Abogado", "Abogada"],
  ["Diseñador gráfico", "Diseñadora gráfica"],
  ["Estudiante universitario", "Estudiante universitaria"],
  ["Comerciante", "Comerciante"],
  ["Asistente administrativo", "Asistente administrativa"],
  ["Médico", "Médica"],
  ["Ingeniero civil", "Ingeniera civil"],
  ["Vendedor", "Vendedora"],
  ["Analista de datos", "Analista de datos"],
  ["Cocinero", "Cocinera"],
  ["Economista", "Economista"],
  ["Independiente", "Ama de casa"],
  ["Jubilado", "Jubilada"],
  ["Técnico electricista", "Técnica en farmacia"],
  ["Arquitecto", "Arquitecta"],
  ["Periodista", "Periodista"],
  ["Ejecutivo de ventas", "Ejecutiva de ventas"],
  ["Emprendedor", "Emprendedora"],
  ["Programador", "Programadora"],
  ["Operario de producción", "Operaria de producción"],
  ["Cajero de banco", "Cajera de banco"],
  ["Auxiliar de educación", "Auxiliar de educación"],
  ["Agente de call center", "Agente de call center"],
  ["Conductor por aplicativo", "Obstetra"],
  ["Policía", "Policía"],
  ["Mecánico automotriz", "Cosmetóloga"],
  ["Ingeniero industrial", "Ingeniera industrial"],
];

