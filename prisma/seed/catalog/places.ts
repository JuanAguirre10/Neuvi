// Ciudades donde hay cuentas de Neuvi: distritos (agrupados por zona) y calles para direcciones.

export type Region = "lima" | "arequipa" | "trujillo" | "cusco" | "piura" | "chiclayo" | "huancayo";

type City = {
  /** Zonas de la ciudad: los pacientes suelen vivir en la zona del consultorio. */
  zones: readonly (readonly string[])[];
  streets: readonly string[];
  /** Precio de una sesión suelta en soles (rango típico de la zona). */
  sessionPrice: readonly [number, number];
};

export const CITIES: Record<Region, City> = {
  lima: {
    zones: [
      ["Miraflores", "San Isidro", "Santiago de Surco", "San Borja", "Barranco", "Surquillo", "La Molina"],
      ["Jesús María", "Lince", "Magdalena del Mar", "Pueblo Libre", "San Miguel", "Breña", "Lima"],
      ["Los Olivos", "San Martín de Porres", "Comas", "Independencia", "Puente Piedra", "Carabayllo"],
      ["San Juan de Lurigancho", "Ate", "Santa Anita", "El Agustino", "La Molina"],
      ["Chorrillos", "Villa El Salvador", "San Juan de Miraflores", "Villa María del Triunfo", "Santiago de Surco"],
    ],
    streets: [
      "Av. Arequipa", "Av. Brasil", "Av. Benavides", "Av. Angamos Este", "Av. Javier Prado Este", "Av. La Marina",
      "Av. Universitaria", "Av. Salaverry", "Av. Petit Thouars", "Jr. Huiracocha", "Calle Los Pinos", "Av. Primavera",
      "Av. El Polo", "Av. Próceres de la Independencia", "Av. Carlos Izaguirre", "Av. Túpac Amaru", "Av. Nicolás Ayllón",
      "Av. Pachacútec", "Av. Huaylas", "Calle Las Begonias", "Av. San Felipe", "Av. Sucre", "Av. Bolívar", "Jr. Cuzco",
      "Av. Antúnez de Mayolo", "Av. Canadá", "Av. Defensores del Morro", "Av. Los Héroes", "Calle Schell", "Av. Faucett",
    ],
    sessionPrice: [70, 170],
  },
  arequipa: {
    zones: [
      ["Arequipa", "Yanahuara", "Cayma", "Sachaca"],
      ["José Luis Bustamante y Rivero", "Paucarpata", "Cerro Colorado", "Miraflores"],
    ],
    streets: ["Av. Ejército", "Calle Mercaderes", "Av. Dolores", "Av. Cayma", "Calle San Juan de Dios", "Av. Goyeneche", "Av. Lambramani", "Calle Jerusalén", "Av. Trinidad Morán"],
    sessionPrice: [70, 110],
  },
  trujillo: {
    zones: [["Trujillo", "Víctor Larco Herrera", "Huanchaco"], ["La Esperanza", "El Porvenir", "Florencia de Mora", "Trujillo"]],
    streets: ["Av. España", "Av. Larco", "Jr. Pizarro", "Av. América Sur", "Av. Húsares de Junín", "Jr. Bolívar", "Av. Mansiche", "Av. Fátima"],
    sessionPrice: [70, 110],
  },
  cusco: {
    zones: [["Cusco", "Wanchaq", "Santiago"], ["San Sebastián", "San Jerónimo", "Wanchaq"]],
    streets: ["Av. de la Cultura", "Av. El Sol", "Calle Tullumayo", "Av. Garcilaso", "Av. Huayruropata", "Av. Pardo", "Calle Ayacucho"],
    sessionPrice: [60, 100],
  },
  piura: {
    zones: [["Piura", "Castilla", "Veintiséis de Octubre"]],
    streets: ["Av. Grau", "Av. Sánchez Cerro", "Calle Lima", "Av. Loreto", "Av. Guardia Civil", "Av. Andrés Avelino Cáceres", "Calle Tacna"],
    sessionPrice: [60, 100],
  },
  chiclayo: {
    zones: [["Chiclayo", "La Victoria", "José Leonardo Ortiz", "Pimentel"]],
    streets: ["Av. Balta", "Av. Luis Gonzales", "Av. Bolognesi", "Calle Elías Aguirre", "Av. Salaverry", "Av. Grau", "Calle San José"],
    sessionPrice: [60, 100],
  },
  huancayo: {
    zones: [["Huancayo", "El Tambo", "Chilca"]],
    streets: ["Calle Real", "Av. Giráldez", "Jr. Puno", "Av. Ferrocarril", "Av. Huancavelica", "Jr. Ancash", "Av. Mariscal Castilla"],
    sessionPrice: [55, 90],
  },
};

/** Zona (lista de distritos) a la que pertenece un distrito. */
export function zoneOf(region: Region, district: string): readonly string[] {
  const city = CITIES[region];
  return city.zones.find((z) => z.includes(district)) ?? city.zones[0]!;
}
