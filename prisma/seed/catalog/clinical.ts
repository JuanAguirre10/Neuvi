// Textos clínicos para historias y notas de evolución, agrupados por motivo de consulta.
// Marcadores de género: {o} -> o/a, {a} -> ""/a. En menores: {acomp} ("su madre"), {Acomp}, {nino}, {adolescente}.

export type AgeGroup = "nino" | "adolescente" | "adulto";
export type MentalTone = "ansioso" | "triste" | "neutro" | "nino";

export type Theme = {
  ages: readonly AgeGroup[];
  codes: readonly (string | null)[];
  mental: MentalTone;
  /** Probabilidad de riesgo moderado o alto en la ficha. */
  risk: number;
  reasons: readonly string[];
  history: readonly string[];
  impressions: readonly string[];
  goals: readonly string[];
  plans: readonly string[];
  topics: readonly string[];
  interventions: readonly string[];
  homework: readonly string[];
  work: readonly string[];
  next: readonly string[];
};

const THEME_DATA = {
  ansiedad: {
    ages: ["adulto"],
    codes: ["F41.1"],
    mental: "ansioso",
    risk: 0.03,
    reasons: [
      "Preocupación constante por el trabajo y la salud de su familia; le cuesta relajarse.",
      "Ansiedad y dificultad para dormir por la carga laboral.",
      "Tensión muscular, nerviosismo y dolores de cabeza casi todos los días.",
      "Se siente desbordad{o} por las responsabilidades y no logra concentrarse.",
    ],
    history: [
      "Refiere que los síntomas empezaron hace unos {n} meses, a raíz de un cambio de puesto. La preocupación aumentó en las últimas semanas y ya afecta su descanso.",
      "Desde hace {n} meses se preocupa por casi todo: la salud de sus padres, el dinero y el trabajo. Refiere tensión en el cuello y sueño interrumpido.",
      "Los síntomas aparecieron hace {n} meses, cuando su padre fue hospitalizado. Aunque él ya se recuperó, la preocupación no ha disminuido.",
    ],
    impressions: [
      "Sintomatología ansiosa de intensidad moderada, compatible con ansiedad generalizada.",
      "Ansiedad generalizada de intensidad leve a moderada, con impacto en el sueño.",
    ],
    goals: [
      "1) Reducir la frecuencia e intensidad de la preocupación. 2) Mejorar la calidad del sueño. 3) Incorporar técnicas de regulación en su rutina diaria.",
    ],
    plans: [
      "Terapia cognitivo-conductual, una sesión semanal: psicoeducación, reestructuración cognitiva y entrenamiento en relajación.",
    ],
    topics: ["Preocupaciones de la semana", "Pensamientos catastróficos", "Higiene del sueño", "Pausas y manejo del tiempo en el trabajo", "Tolerancia a la incertidumbre"],
    interventions: ["Reestructuración cognitiva", "Respiración diafragmática", "Relajación muscular progresiva", "Psicoeducación sobre la ansiedad", "Técnica de posponer la preocupación"],
    homework: ["Registro de preocupaciones con nivel de ansiedad (0-10)", "Practicar respiración diafragmática 10 minutos al día", "Diario de sueño", "Reservar 15 minutos fijos al día para preocuparse"],
    work: [
      "Se identificaron los pensamientos catastróficos más frecuentes y se buscaron alternativas más realistas.",
      "Se practicó la respiración diafragmática y se revisó en qué momentos del día aplicarla.",
      "Se analizó una situación del trabajo que le generó mucha preocupación y cómo la manejó.",
      "Se trabajó la diferencia entre problemas que puede resolver y preocupaciones hipotéticas.",
    ],
    next: ["Revisar el registro de preocupaciones y avanzar con la reestructuración.", "Continuar con relajación muscular progresiva.", "Evaluar cambios en el sueño."],
  },
  panico: {
    ages: ["adulto"],
    codes: ["F41.0"],
    mental: "ansioso",
    risk: 0.02,
    reasons: [
      "Crisis de angustia en espacios concurridos; evita el transporte público.",
      "Episodios de taquicardia y sensación de ahogo; fue dos veces a emergencia y los exámenes salieron normales.",
      "Miedo intenso a volver a tener una crisis; dejó de manejar.",
    ],
    history: [
      "La primera crisis fue hace {n} meses en el bus, camino al trabajo. Desde entonces tuvo varias más y empezó a evitar los lugares donde ocurrieron.",
      "Refiere crisis de angustia desde hace {n} meses. Acudió a emergencia por dolor de pecho; el cardiólogo descartó causas médicas.",
    ],
    impressions: ["Crisis de angustia recurrentes con conductas de evitación, compatibles con trastorno de pánico."],
    goals: ["1) Reducir la frecuencia de las crisis. 2) Disminuir la evitación de lugares y situaciones. 3) Manejar las sensaciones corporales sin alarmarse."],
    plans: ["Terapia cognitivo-conductual: psicoeducación sobre el pánico, exposición interoceptiva y exposición gradual en vivo. Una sesión semanal."],
    topics: ["Ciclo del pánico", "Sensaciones corporales y su interpretación", "Situaciones que evita", "Exposición gradual", "Prevención de recaídas"],
    interventions: ["Psicoeducación sobre el pánico", "Exposición interoceptiva", "Exposición gradual en vivo", "Respiración lenta", "Reestructuración cognitiva"],
    homework: ["Registro de crisis: situación, sensaciones y pensamientos", "Viajar dos paraderos en bus acompañad{o}", "Ejercicio de exposición interoceptiva en casa", "Practicar respiración lenta dos veces al día"],
    work: [
      "Se explicó el ciclo del pánico y se relacionó con su última crisis.",
      "Se elaboró la jerarquía de situaciones que evita, de menor a mayor dificultad.",
      "Se hizo un ejercicio de exposición interoceptiva en sesión; toleró las sensaciones sin escapar.",
      "Se revisaron los avances en la exposición: logró ir al supermercado en hora punta.",
    ],
    next: ["Subir un escalón en la jerarquía de exposición.", "Revisar el registro de crisis.", "Repetir la exposición interoceptiva."],
  },
  depresion: {
    ages: ["adulto", "adulto", "adolescente"],
    codes: ["F32.0", "F32.1"],
    mental: "triste",
    risk: 0.15,
    reasons: [
      "Estado de ánimo bajo tras la ruptura de una relación de pareja.",
      "Desgano y pérdida de interés en sus actividades desde hace varios meses.",
      "Llora con facilidad, duerme mucho y dejó de salir con sus amistades.",
      "Se siente sin energía y con culpa por no rendir como antes.",
    ],
    history: [
      "Refiere ánimo bajo desde hace unos {n} meses, tras perder su trabajo. Dejó de hacer ejercicio y pasa gran parte del día en casa.",
      "El ánimo bajo empezó hace {n} meses, después de una ruptura. Refiere aislamiento progresivo y cambios en el apetito.",
      "Síntomas depresivos desde hace {n} meses sin un desencadenante claro; la familia nota que ya no disfruta de nada.",
    ],
    impressions: ["Episodio depresivo leve.", "Episodio depresivo moderado, sin síntomas psicóticos."],
    goals: ["1) Mejorar el estado de ánimo y retomar actividades agradables. 2) Regularizar el sueño y la alimentación. 3) Identificar y modificar pensamientos de desvalorización."],
    plans: ["Terapia cognitivo-conductual con activación conductual, una sesión semanal. Se sugiere evaluación psiquiátrica si no mejora en ocho semanas."],
    topics: ["Activación conductual", "Pensamientos de desvalorización", "Rutina de sueño y alimentación", "Red de apoyo", "Autocuidado"],
    interventions: ["Activación conductual", "Registro de pensamientos", "Psicoeducación sobre la depresión", "Programación de actividades", "Resolución de problemas"],
    homework: ["Programar tres actividades agradables en la semana", "Registro diario de ánimo (0-10)", "Caminar 20 minutos al día", "Llamar a una persona cercana con quien no habla hace tiempo"],
    work: [
      "Se revisó la programación de actividades: cumplió dos de las tres acordadas.",
      "Se trabajó con un registro de pensamientos sobre una situación en la que se sintió inútil.",
      "Se exploraron las actividades que antes disfrutaba y cuáles podría retomar.",
      "Se habló de su red de apoyo y de cómo pedir ayuda sin sentirse una carga.",
    ],
    next: ["Aumentar las actividades programadas.", "Continuar con el registro de pensamientos.", "Revisar el ánimo de la semana."],
  },
  duelo: {
    ages: ["adulto"],
    codes: ["Z63.4", "F43.2"],
    mental: "triste",
    risk: 0.05,
    reasons: [
      "Duelo por el fallecimiento de su madre hace unos meses.",
      "Pérdida de su pareja; dificultad para retomar su rutina.",
      "Muerte inesperada de un hermano; tiene pensamientos recurrentes sobre lo ocurrido.",
      "Duelo por la pérdida de un embarazo.",
    ],
    history: [
      "La pérdida ocurrió hace {n} meses. Refiere tristeza intensa, insomnio y dificultad para hablar del tema con su familia.",
      "Desde la pérdida, hace {n} meses, evita los lugares que le recuerdan a su familiar y siente culpa por no haber hecho más.",
    ],
    impressions: ["Duelo con dificultades en su elaboración, sin criterios de duelo complicado por ahora.", "Reacción de duelo con síntomas depresivos leves."],
    goals: ["1) Favorecer la expresión emocional y la elaboración de la pérdida. 2) Retomar progresivamente sus actividades. 3) Fortalecer el apoyo familiar."],
    plans: ["Acompañamiento en duelo con enfoque integrativo, una sesión semanal y luego quincenal."],
    topics: ["Recuerdos de la persona fallecida", "Culpa y asuntos pendientes", "Fechas significativas", "Rutina y autocuidado", "Apoyo de la familia"],
    interventions: ["Escucha activa y validación emocional", "Carta de despedida", "Técnica de la silla vacía", "Psicoeducación sobre el duelo", "Ritual de cierre"],
    homework: ["Escribir una carta a su familiar", "Armar un álbum de recuerdos", "Retomar una actividad que compartían", "Conversar con su familia sobre cómo se siente"],
    work: [
      "Habló de los últimos días de su familiar y de las emociones que aparecen al recordarlos.",
      "Se trabajó la culpa por no haber estado presente; se revisaron los hechos con más compasión.",
      "Se preparó el manejo de una fecha significativa que se acerca.",
      "Leyó en sesión la carta de despedida que escribió; se mostró conmovid{o} y aliviad{o}.",
    ],
    next: ["Continuar con la elaboración de la pérdida.", "Preparar la fecha de aniversario.", "Revisar la carta de despedida."],
  },
  estres: {
    ages: ["adulto"],
    codes: ["Z73.0", "F43.2"],
    mental: "ansioso",
    risk: 0.02,
    reasons: [
      "Agotamiento y estrés por la carga laboral; irritabilidad en casa.",
      "Siente que no desconecta del trabajo; revisa correos hasta la madrugada.",
      "Cansancio constante y dolores de espalda; su médico le sugirió atención psicológica.",
    ],
    history: [
      "Hace {n} meses asumió una jefatura con más responsabilidades. Desde entonces duerme poco, discute en casa y siente que no rinde.",
      "Trabaja más de 10 horas diarias desde hace {n} meses por una reestructuración en su empresa. Refiere agotamiento y falta de motivación.",
    ],
    impressions: ["Estrés laboral con síntomas de agotamiento.", "Reacción de estrés con síntomas ansiosos y somáticos."],
    goals: ["1) Reducir el agotamiento y recuperar espacios de descanso. 2) Poner límites entre el trabajo y la vida personal. 3) Mejorar la comunicación en casa."],
    plans: ["Intervención cognitivo-conductual breve, una sesión semanal: manejo del estrés, organización del tiempo y asertividad."],
    topics: ["Límites con el trabajo", "Organización del tiempo", "Descanso y pausas activas", "Comunicación asertiva con su jefe", "Irritabilidad en casa"],
    interventions: ["Entrenamiento en asertividad", "Organización del tiempo", "Relajación muscular progresiva", "Solución de problemas", "Psicoeducación sobre el estrés"],
    homework: ["No revisar correos después de las 8 p. m.", "Agenda semanal con pausas", "Relajación antes de dormir", "Ensayar la conversación con su jefe"],
    work: [
      "Se revisó una semana típica de trabajo y se identificaron tareas que podría delegar.",
      "Se ensayó cómo plantear a su jefe la redistribución de tareas.",
      "Se trabajó la culpa que siente cuando descansa.",
      "Refiere que logró desconectarse dos noches de la semana; se reforzó el avance.",
    ],
    next: ["Revisar el cumplimiento de los límites horarios.", "Continuar con asertividad.", "Evaluar el nivel de agotamiento."],
  },
  pareja: {
    ages: ["adulto"],
    codes: ["Z63.0"],
    mental: "neutro",
    risk: 0.02,
    reasons: [
      "Discusiones frecuentes con su pareja y dificultades de comunicación.",
      "Crisis de pareja tras una infidelidad; evalúan si continuar la relación.",
      "Distanciamiento con su pareja desde el nacimiento de su segundo hijo.",
      "Conflictos por la distribución de tareas y el manejo del dinero.",
    ],
    history: [
      "Llevan varios años de relación. Las discusiones aumentaron hace unos {n} meses y ahora casi no conversan sin pelear.",
      "La crisis empezó hace {n} meses al descubrir mensajes de su pareja. Ambos aceptaron asistir a terapia.",
    ],
    impressions: ["Conflicto de pareja con un patrón de comunicación de ataque y retirada.", "Crisis de pareja asociada a ruptura de la confianza."],
    goals: ["1) Mejorar la comunicación y reducir las escaladas en las discusiones. 2) Reconstruir la confianza. 3) Acordar la distribución de responsabilidades en casa."],
    plans: ["Terapia de pareja con enfoque sistémico: sesiones conjuntas semanales y una sesión individual con cada miembro."],
    topics: ["Patrón de discusión", "Escucha activa", "Confianza", "Tareas del hogar y dinero", "Tiempo de calidad en pareja"],
    interventions: ["Entrenamiento en comunicación", "Técnica del tiempo fuera", "Reencuadre", "Tareas conjuntas", "Escultura de pareja"],
    homework: ["Conversación diaria de 15 minutos sin celulares", "Usar el tiempo fuera cuando suba el tono", "Planificar una salida juntos", "Lista de necesidades de cada uno"],
    work: [
      "Sesión conjunta: se identificó el patrón de ataque y retirada en la última discusión.",
      "Se practicó la escucha activa: cada uno resumió lo que entendió del otro.",
      "Se trabajó cómo pedir lo que necesita sin reproches.",
      "Revisaron la tarea: lograron dos conversaciones tranquilas en la semana.",
    ],
    next: ["Sesión conjunta para revisar acuerdos.", "Continuar con el entrenamiento en comunicación.", "Sesión individual con cada miembro."],
  },
  familia: {
    ages: ["adulto", "adolescente"],
    codes: ["Z63.8"],
    mental: "neutro",
    risk: 0.03,
    reasons: [
      "Conflictos familiares y dificultades de comunicación en casa.",
      "Discusiones constantes en casa desde que la familia se mudó con los abuelos.",
      "Dificultades para poner límites en casa; los conflictos terminan en gritos.",
      "Tensión familiar tras la separación de los padres.",
    ],
    history: [
      "Los conflictos se intensificaron hace {n} meses. Refieren gritos frecuentes y que cada uno se aísla en su cuarto.",
      "La familia atraviesa cambios desde hace {n} meses (mudanza y nuevo trabajo de la madre) y la convivencia se volvió tensa.",
    ],
    impressions: ["Dificultades en la comunicación familiar y en el establecimiento de límites."],
    goals: ["1) Mejorar la comunicación entre los miembros de la familia. 2) Establecer normas y límites claros. 3) Recuperar espacios de convivencia positiva."],
    plans: ["Terapia familiar sistémica, sesiones semanales alternando sesiones familiares e individuales."],
    topics: ["Normas y límites en casa", "Comunicación entre padres e hijos", "Roles familiares", "Manejo de discusiones", "Tiempo en familia"],
    interventions: ["Genograma", "Reencuadre", "Acuerdos familiares por escrito", "Entrenamiento en comunicación", "Preguntas circulares"],
    homework: ["Reunión familiar semanal de 20 minutos", "Lista de normas acordadas", "Una actividad en familia el fin de semana", "Anotar las discusiones y cómo terminaron"],
    work: [
      "Se elaboró el genograma familiar y se identificaron alianzas y conflictos.",
      "Se revisaron las normas de la casa y se acordaron consecuencias claras.",
      "Se trabajó cómo expresar el desacuerdo sin gritos.",
      "La familia comenta que la semana fue más tranquila; se reforzaron los acuerdos.",
    ],
    next: ["Sesión familiar para revisar acuerdos.", "Continuar con el trabajo en límites.", "Sesión individual con el hijo mayor."],
  },
  autoestima: {
    ages: ["adulto", "adolescente"],
    codes: [null],
    mental: "neutro",
    risk: 0.03,
    reasons: [
      "Baja autoestima e inseguridad en el trabajo.",
      "Se compara constantemente con los demás y se siente insuficiente.",
      "Le cuesta decir que no y siente que los demás abusan de su confianza.",
    ],
    history: [
      "Refiere inseguridad desde la adolescencia, que se intensificó hace {n} meses tras una evaluación negativa.",
      "Siempre se consideró tímid{o}; en los últimos {n} meses evita proponer ideas por miedo a equivocarse.",
    ],
    impressions: ["Baja autoestima con estilo de comunicación pasivo."],
    goals: ["1) Fortalecer la autoestima y la autovaloración. 2) Desarrollar un estilo de comunicación asertivo. 3) Reducir la autocrítica."],
    plans: ["Terapia cognitivo-conductual, una sesión semanal: reestructuración de creencias sobre sí mism{o} y entrenamiento en asertividad."],
    topics: ["Autocrítica", "Logros y fortalezas", "Asertividad", "Comparación con otros", "Creencias sobre sí mism{o}"],
    interventions: ["Registro de logros", "Reestructuración cognitiva", "Entrenamiento en asertividad", "Role playing", "Autocompasión"],
    homework: ["Anotar tres logros diarios", "Decir que no a un pedido que no quiere atender", "Carta compasiva hacia sí mism{o}", "Registro de pensamientos autocríticos"],
    work: [
      "Se revisó el registro de logros; le costó reconocer algunos como propios.",
      "Role playing de una situación en la que necesitaba poner un límite.",
      "Se trabajó la creencia de que debe hacerlo todo perfecto.",
      "Comenta que se animó a proponer una idea en una reunión; se reforzó el avance.",
    ],
    next: ["Continuar con el registro de logros.", "Ensayar nuevas situaciones de asertividad.", "Trabajar la creencia central."],
  },
  social: {
    ages: ["adolescente", "adulto"],
    codes: ["F40.1"],
    mental: "ansioso",
    risk: 0.03,
    reasons: [
      "Le cuesta hablar en público y evita las reuniones sociales.",
      "Se pone muy nervios{o} al exponer en clase; ha faltado para no hacerlo.",
      "Evita llamar por teléfono o hablar con personas que no conoce.",
    ],
    history: [
      "Refiere timidez desde la infancia. Desde hace {n} meses la ansiedad le impide participar en clases y reuniones.",
      "Los síntomas empeoraron hace {n} meses, al empezar un trabajo que exige presentaciones frecuentes.",
    ],
    impressions: ["Ansiedad social con evitación de situaciones de evaluación."],
    goals: ["1) Reducir la ansiedad en situaciones sociales. 2) Disminuir la evitación. 3) Desarrollar habilidades sociales y de comunicación."],
    plans: ["Terapia cognitivo-conductual con exposición gradual y entrenamiento en habilidades sociales, una sesión semanal."],
    topics: ["Situaciones sociales temidas", "Pensamientos sobre la evaluación de otros", "Exposición gradual", "Habilidades de conversación", "Conductas de seguridad"],
    interventions: ["Exposición gradual", "Reestructuración cognitiva", "Entrenamiento en habilidades sociales", "Role playing", "Atención enfocada hacia afuera"],
    homework: ["Iniciar una conversación breve con un compañero", "Hacer una pregunta en clase o en una reunión", "Registro de situaciones sociales y nivel de ansiedad", "Llamar por teléfono para pedir información"],
    work: [
      "Se construyó la jerarquía de situaciones sociales temidas.",
      "Se ensayó en sesión una exposición oral breve; la ansiedad bajó de 8 a 5.",
      "Se trabajaron los pensamientos sobre lo que los demás piensan de su desempeño.",
      "Logró participar en una reunión sin retirarse antes; se reforzó el logro.",
    ],
    next: ["Siguiente paso de la jerarquía de exposición.", "Ensayar una presentación corta.", "Revisar el registro de situaciones sociales."],
  },
  adolescente: {
    ages: ["adolescente"],
    codes: ["F43.2", null],
    mental: "neutro",
    risk: 0.12,
    reasons: [
      "Estrés académico y temor a desaprobar cursos.",
      "Conflictos con sus padres y aislamiento en su cuarto.",
      "Cambios de ánimo y bajo rendimiento escolar este año.",
      "Problemas con su grupo de amigos; refiere sentirse excluid{o} en el colegio.",
    ],
    history: [
      "Los padres notan cambios desde hace {n} meses: pasa mucho tiempo en el celular, contesta mal y bajó sus notas.",
      "Refiere estrés desde que empezó la academia preuniversitaria hace {n} meses; duerme poco y siente que no le alcanza el tiempo.",
      "Hace {n} meses tuvo un conflicto con su grupo de amigos y desde entonces no quiere ir al colegio.",
    ],
    impressions: ["Dificultades emocionales propias de la adolescencia con impacto en el rendimiento escolar.", "Reacción de adaptación con síntomas ansiosos y depresivos leves."],
    goals: ["1) Mejorar la expresión emocional y la comunicación con sus padres. 2) Organizar sus hábitos de estudio y descanso. 3) Fortalecer su red de amistades."],
    plans: ["Psicoterapia individual semanal con enfoque cognitivo-conductual y una sesión de orientación a padres cada mes."],
    topics: ["Relación con sus padres", "Uso del celular y redes sociales", "Organización del estudio", "Amistades y colegio", "Manejo de la frustración"],
    interventions: ["Psicoeducación emocional", "Técnicas de estudio y organización", "Resolución de problemas", "Orientación a padres", "Registro de emociones"],
    homework: ["Horario de estudio con pausas", "Dejar el celular fuera del cuarto al dormir", "Registro de emociones del día", "Conversar en casa sobre un tema que le preocupa"],
    work: [
      "Se trabajó la relación con sus padres; identifica que las discusiones empiezan por el uso del celular.",
      "Se armó un horario de estudio realista para la semana de exámenes.",
      "Habló de la situación con sus amigos del colegio y de cómo le afecta.",
      "Se dio orientación a {acomp} sobre cómo acompañar sin presionar.",
    ],
    next: ["Revisar el horario de estudio.", "Sesión de orientación a padres.", "Continuar con el registro de emociones."],
  },
  conducta: {
    ages: ["nino"],
    codes: ["F91.3", null],
    mental: "nino",
    risk: 0,
    reasons: [
      "Rabietas frecuentes y conducta desafiante en casa y en el colegio.",
      "No respeta las normas en casa; la tutora reporta peleas con compañeros.",
      "Golpea a su hermano menor cuando se frustra.",
    ],
    history: [
      "{Acomp} refiere que las rabietas aumentaron hace {n} meses, tras el nacimiento de su hermana.",
      "En el colegio reportan conductas agresivas desde hace {n} meses; en casa responde con gritos cuando se le pone un límite.",
    ],
    impressions: ["Dificultades en la regulación emocional y conductual, con pautas de crianza poco consistentes."],
    goals: ["1) Disminuir las rabietas y conductas agresivas. 2) Brindar a los padres pautas de crianza consistentes. 3) Favorecer la expresión adecuada del enojo."],
    plans: ["Terapia de juego semanal con orientación a padres cada dos sesiones."],
    topics: ["Reconocer el enojo", "Normas y consecuencias en casa", "Juego de turnos", "Refuerzo positivo", "Relación con su hermano"],
    interventions: ["Juego terapéutico", "Economía de fichas", "Técnica del semáforo", "Orientación a padres", "Cuentos terapéuticos"],
    homework: ["Tabla de puntos para conductas positivas", "Practicar la técnica del semáforo", "Tiempo especial de juego con papá 15 minutos al día", "Dibujar las emociones de la semana"],
    work: [
      "A través del juego se trabajó reconocer el enojo y ponerle nombre.",
      "Se explicó a los padres el uso de la tabla de puntos y las consecuencias consistentes.",
      "Juego de turnos: logró esperar y tolerar perder sin rabieta.",
      "{Acomp} refiere menos rabietas esta semana; se reforzó el uso del refuerzo positivo.",
    ],
    next: ["Orientación a padres.", "Continuar con el juego de turnos.", "Revisar la tabla de puntos."],
  },
  atencion: {
    ages: ["nino"],
    codes: ["F90.0", null],
    mental: "nino",
    risk: 0,
    reasons: [
      "Dificultades de atención y conducta en el colegio (referido por la tutora).",
      "Se distrae con facilidad, no termina las tareas y pierde sus útiles.",
      "Inquietud motora y dificultad para esperar su turno en clase.",
    ],
    history: [
      "La tutora reporta desde hace {n} meses que no permanece en su sitio y no termina las actividades.",
      "Los padres notan dificultades de atención desde el inicial; este año bajó su rendimiento escolar.",
    ],
    impressions: [
      "Indicadores de dificultades atencionales e hiperactividad; se recomienda evaluación por neuropediatría.",
      "Sintomatología compatible con TDAH de presentación combinada, pendiente de confirmación.",
    ],
    goals: ["1) Mejorar la atención sostenida en tareas escolares. 2) Establecer rutinas en casa. 3) Coordinar estrategias con el colegio."],
    plans: ["Intervención cognitivo-conductual semanal con entrenamiento a padres y coordinación con el colegio."],
    topics: ["Rutinas en casa", "Organización de las tareas", "Autoinstrucciones", "Coordinación con la tutora", "Control de impulsos"],
    interventions: ["Autoinstrucciones", "Juegos de atención", "Economía de fichas", "Orientación a padres", "Agenda visual"],
    homework: ["Rutina visual para las mañanas", "Hacer las tareas en bloques de 15 minutos", "Juego de memoria con los padres", "Revisar la agenda escolar cada noche"],
    work: [
      "Se trabajó con juegos de atención; logró sostener la tarea 10 minutos.",
      "Se practicaron autoinstrucciones antes de empezar una tarea.",
      "Se revisó con los padres la rutina de las mañanas y de las tareas.",
      "Se coordinó con la tutora el uso de una agenda de conducta.",
    ],
    next: ["Continuar con autoinstrucciones.", "Revisar la agenda escolar.", "Orientación a padres."],
  },
  separacion: {
    ages: ["nino"],
    codes: ["F93.0", "F43.2"],
    mental: "nino",
    risk: 0,
    reasons: [
      "Ansiedad de separación al ir al colegio.",
      "Llora intensamente cuando su madre sale de casa; no quiere dormir sol{o}.",
      "Cambios de conducta tras la separación de los padres.",
    ],
    history: [
      "Desde hace {n} meses llora cada mañana al llegar al colegio y pide regresar a casa.",
      "Los padres se separaron hace {n} meses. Desde entonces está más irritable y no quiere separarse de su madre.",
    ],
    impressions: ["Ansiedad de separación en contexto de cambios familiares.", "Reacción de adaptación a la separación de los padres."],
    goals: ["1) Disminuir la ansiedad al separarse de sus figuras de apego. 2) Favorecer la expresión de emociones sobre los cambios en casa. 3) Orientar a los padres para despedidas predecibles."],
    plans: ["Terapia de juego semanal y orientación a padres cada dos sesiones."],
    topics: ["Despedidas en el colegio", "Miedos a la hora de dormir", "Emociones sobre la separación", "Rutinas predecibles", "Valentía"],
    interventions: ["Juego terapéutico", "Cuentos terapéuticos", "Exposición gradual", "Orientación a padres", "Dibujo libre"],
    homework: ["Ritual de despedida corto en la puerta del colegio", "Dormir con luz tenue y su peluche", "Leer el cuento trabajado en sesión", "Calendario de días con papá y con mamá"],
    work: [
      "Mediante el juego con muñecos representó la despedida en el colegio.",
      "Se trabajó con un cuento sobre los cambios en la familia; hizo preguntas sobre la separación.",
      "Se orientó a {acomp} para despedirse sin prolongar el momento.",
      "{Acomp} refiere que esta semana entró al colegio sin llorar dos días.",
    ],
    next: ["Continuar con la exposición gradual a la separación.", "Orientación a padres.", "Trabajar emociones con dibujo."],
  },
  neuro: {
    ages: ["nino", "nino", "adolescente"],
    codes: ["F81.0", "F81.9", null],
    mental: "nino",
    risk: 0,
    reasons: [
      "Evaluación por bajo rendimiento escolar y dificultades en la lectura.",
      "Evaluación neuropsicológica solicitada por el colegio por problemas de aprendizaje.",
      "Dificultades en matemáticas y en la escritura; la profesora sugiere evaluación.",
    ],
    history: [
      "Desde los primeros grados presenta dificultades para leer; este año desaprobó Comunicación.",
      "Los padres refieren que necesita mucha ayuda para hacer las tareas desde hace {n} meses.",
    ],
    impressions: ["Perfil compatible con dificultades específicas en la lectura.", "Rendimiento intelectual dentro del promedio con dificultades en atención y memoria de trabajo."],
    goals: ["1) Completar la evaluación neuropsicológica. 2) Entregar el informe con recomendaciones al colegio. 3) Iniciar la intervención en las áreas afectadas."],
    plans: ["Evaluación neuropsicológica en cuatro sesiones y luego intervención semanal en lectoescritura y funciones ejecutivas."],
    topics: ["Evaluación de la atención", "Evaluación de la memoria", "Lectura y escritura", "Funciones ejecutivas", "Devolución de resultados"],
    interventions: ["Aplicación de pruebas neuropsicológicas", "Entrenamiento en conciencia fonológica", "Juegos de memoria de trabajo", "Devolución a padres", "Coordinación con el colegio"],
    homework: ["Lectura compartida 15 minutos diarios", "Juegos de memoria en casa", "Ejercicios de conciencia fonológica", "Traer los cuadernos del colegio a la próxima sesión"],
    work: [
      "Se aplicaron pruebas de atención y memoria; trabajó con buena disposición.",
      "Se continuó con la evaluación de lectura y escritura.",
      "Sesión de devolución: se explicaron los resultados a los padres y las recomendaciones para el colegio.",
      "Se trabajó conciencia fonológica con juegos de rimas y sílabas.",
    ],
    next: ["Continuar con la evaluación.", "Preparar la devolución a padres.", "Continuar con la intervención en lectura."],
  },
  insomnio: {
    ages: ["adulto"],
    codes: ["F51.0"],
    mental: "ansioso",
    risk: 0.02,
    reasons: [
      "Dificultad para conciliar el sueño desde hace meses; se levanta cansad{o}.",
      "Se despierta a las 3 a. m. y no logra volver a dormir.",
      "Duerme cuatro o cinco horas por noche y toma pastillas sin receta.",
    ],
    history: [
      "El insomnio empezó hace {n} meses, con el cambio a turnos rotativos en su trabajo.",
      "Refiere dificultad para dormir desde hace {n} meses; usa el celular en la cama hasta tarde.",
    ],
    impressions: ["Insomnio de conciliación asociado a hábitos de sueño inadecuados y preocupación."],
    goals: ["1) Mejorar la calidad y cantidad del sueño. 2) Establecer hábitos de higiene del sueño. 3) Reducir la preocupación nocturna."],
    plans: ["Terapia cognitivo-conductual para el insomnio, una sesión semanal durante dos meses."],
    topics: ["Higiene del sueño", "Control de estímulos", "Preocupación nocturna", "Horario regular", "Uso de pantallas"],
    interventions: ["Control de estímulos", "Restricción del sueño", "Relajación", "Reestructuración de creencias sobre el sueño", "Psicoeducación"],
    homework: ["Diario de sueño", "Levantarse a la misma hora todos los días", "Dejar el celular fuera de la cama", "Relajación 20 minutos antes de dormir"],
    work: [
      "Se revisó el diario de sueño: duerme en promedio cinco horas y media.",
      "Se explicó el control de estímulos y se ajustó la hora de acostarse.",
      "Se trabajaron las creencias catastróficas sobre no dormir.",
      "Refiere que se duerme más rápido desde que deja el celular fuera del cuarto.",
    ],
    next: ["Revisar el diario de sueño.", "Ajustar la ventana de sueño.", "Continuar con relajación."],
  },
  migracion: {
    ages: ["adulto"],
    codes: ["F43.2"],
    mental: "triste",
    risk: 0.04,
    reasons: [
      "Dificultades para adaptarse tras migrar al Perú; extraña a su familia.",
      "Tristeza y preocupación constante por sus padres, que siguen en su país.",
      "Estrés por la situación laboral y migratoria desde que llegó a Lima.",
    ],
    history: [
      "Llegó al Perú hace varios años, pero desde hace {n} meses se siente más sol{o}. Trabaja en algo distinto a su profesión.",
      "Hace {n} meses se mudó con su pareja; refiere soledad y episodios de llanto.",
    ],
    impressions: ["Reacción de adaptación con síntomas ansiosos y depresivos, en contexto migratorio."],
    goals: ["1) Favorecer la adaptación al nuevo contexto. 2) Elaborar las pérdidas asociadas a la migración. 3) Ampliar su red de apoyo."],
    plans: ["Psicoterapia breve con enfoque integrativo, una sesión semanal."],
    topics: ["Pérdidas de la migración", "Red de apoyo", "Situación laboral", "Contacto con la familia", "Proyecto de vida"],
    interventions: ["Validación emocional", "Resolución de problemas", "Línea de vida", "Activación conductual", "Psicoeducación"],
    homework: ["Buscar un grupo o actividad comunitaria", "Videollamada semanal con su familia", "Línea de vida con metas a seis meses", "Registro de emociones"],
    work: [
      "Se trabajó la línea de vida y las pérdidas que implicó migrar.",
      "Habló de su trabajo actual y de las opciones para validar su título.",
      "Se exploró su red de apoyo en la ciudad.",
      "Refiere que se unió a un grupo de vóley los domingos; se reforzó la iniciativa.",
    ],
    next: ["Continuar con el proyecto de vida.", "Revisar la red de apoyo.", "Trabajar el duelo migratorio."],
  },
} satisfies Record<string, Theme>;

export type ThemeKey = keyof typeof THEME_DATA;
export const THEMES: Record<ThemeKey, Theme> = THEME_DATA;

export type Specialty = { label: string; themes: readonly (readonly [ThemeKey, number])[] };

const SPECIALTY_DATA = {
  tcc: { label: "Terapia cognitivo-conductual (adultos)", themes: [["ansiedad", 3], ["panico", 2], ["depresion", 2], ["estres", 2], ["insomnio", 1], ["social", 1], ["autoestima", 1]] },
  clinica: { label: "Psicología clínica (adultos y adolescentes)", themes: [["ansiedad", 2], ["depresion", 2], ["adolescente", 2], ["autoestima", 1], ["social", 1], ["duelo", 1]] },
  infantil: { label: "Psicología infantil y familiar", themes: [["conducta", 3], ["atencion", 2], ["separacion", 3], ["familia", 1]] },
  pareja: { label: "Terapia de pareja", themes: [["pareja", 6], ["familia", 1], ["depresion", 1]] },
  familia: { label: "Terapia sistémica familiar", themes: [["familia", 4], ["pareja", 2], ["adolescente", 2]] },
  adolescentes: { label: "Psicología de adolescentes", themes: [["adolescente", 5], ["social", 2], ["autoestima", 2], ["depresion", 1]] },
  neuro: { label: "Neuropsicología infantil", themes: [["neuro", 5], ["atencion", 3]] },
  duelo: { label: "Duelo y acompañamiento emocional", themes: [["duelo", 5], ["depresion", 2], ["ansiedad", 1]] },
  act: { label: "Terapia de aceptación y compromiso (ACT)", themes: [["ansiedad", 2], ["depresion", 2], ["estres", 2], ["insomnio", 1]] },
  psicoanalitica: { label: "Psicoterapia psicoanalítica", themes: [["depresion", 2], ["ansiedad", 2], ["autoestima", 2], ["pareja", 1]] },
  salud: { label: "Psicología clínica y de la salud", themes: [["insomnio", 2], ["estres", 2], ["ansiedad", 2], ["duelo", 1]] },
  animo: { label: "Ansiedad y trastornos del estado de ánimo", themes: [["ansiedad", 3], ["panico", 2], ["depresion", 3]] },
} satisfies Record<string, Specialty>;

export type SpecialtyKey = keyof typeof SPECIALTY_DATA;
export const SPECIALTIES: Record<SpecialtyKey, Specialty> = SPECIALTY_DATA;

// ---------- Ficha de ingreso ----------

export const PERSONAL_HISTORY: Record<AgeGroup, readonly string[]> = {
  adulto: [
    "Sin antecedentes médicos relevantes. Niega hospitalizaciones.",
    "Hipotiroidismo en tratamiento. Sin hospitalizaciones previas.",
    "Gastritis crónica y migrañas ocasionales.",
    "Asma en la infancia, actualmente controlada.",
    "Operación de apendicitis hace años, sin complicaciones.",
    "Hipertensión arterial controlada con medicación.",
  ],
  adolescente: [
    "Sin antecedentes médicos relevantes. Buen rendimiento escolar hasta el año pasado.",
    "Rinitis alérgica. Sin hospitalizaciones.",
    "Fractura de brazo a los 10 años. Sin otros antecedentes.",
  ],
  nino: [
    "Embarazo y parto sin complicaciones. Desarrollo psicomotor dentro de lo esperado.",
    "Nació a las 35 semanas; caminó a los 14 meses. Sin hospitalizaciones.",
    "Desarrollo del lenguaje algo tardío; recibió terapia de lenguaje a los 4 años.",
    "Embarazo controlado, parto por cesárea. Sin antecedentes médicos relevantes.",
  ],
};

export const PREVIOUS_TREATMENTS = [
  "Ninguno.",
  "Ninguno.",
  "Ninguno.",
  "Recibió terapia psicológica breve hace dos años.",
  "Atención por psiquiatría el año pasado; dejó el tratamiento por cuenta propia.",
  "Consejería en el colegio o la universidad.",
  "Seis sesiones con otra psicóloga; las interrumpió por horarios.",
] as const;

export const FAMILY_HISTORY = [
  "No refiere antecedentes relevantes.",
  "No refiere antecedentes relevantes.",
  "Madre con antecedentes de ansiedad.",
  "Padre con consumo problemático de alcohol.",
  "Abuela materna con depresión.",
  "Hermano con diagnóstico de TDAH.",
  "Tía paterna con trastorno bipolar.",
] as const;

export const MEDICATION = [
  "Ninguna.",
  "Ninguna.",
  "Ninguna.",
  "Ninguna.",
  "Sertralina 50 mg/día (indicada por psiquiatra).",
  "Escitalopram 10 mg/día (indicado por psiquiatra).",
  "Clonazepam 0.5 mg en caso de crisis (indicado por psiquiatra).",
  "Levotiroxina 50 mcg/día.",
] as const;

export const CHILD_MEDICATION = ["Ninguna.", "Ninguna.", "Ninguna.", "Metilfenidato 10 mg/día (indicado por neuropediatra)."] as const;

export const SUBSTANCE_USE: Record<"adulto" | "adolescente", readonly string[]> = {
  adulto: [
    "Consumo social de alcohol. Niega otras sustancias.",
    "Niega consumo de alcohol, tabaco u otras sustancias.",
    "Fuma 3 a 4 cigarrillos al día.",
    "Consumo de alcohol los fines de semana; refiere haberlo reducido.",
  ],
  adolescente: ["Niega consumo de alcohol y otras sustancias.", "Probó alcohol en reuniones; niega consumo frecuente."],
};

export const MENTAL_STATUS: Record<MentalTone, string> = {
  ansioso:
    "Lúcid{o}, orientad{o} en tiempo, espacio y persona. Discurso coherente, algo acelerado. Afecto ansioso, congruente con el relato. Sin alteraciones de la percepción. Juicio conservado.",
  triste:
    "Lúcid{o} y orientad{o}. Discurso coherente, de ritmo lento. Afecto triste, con llanto durante la entrevista. Niega alteraciones de la percepción. Juicio conservado.",
  neutro:
    "Lúcid{o}, orientad{o} en las tres esferas. Discurso coherente y fluido. Afecto adecuado y congruente. Sin alteraciones del pensamiento ni de la percepción.",
  nino: "Alerta y orientad{o}. Se vincula con facilidad en la sesión. Juego acorde a su edad, con atención dispersa por momentos. Lenguaje comprensible.",
};

export const RISK_NOTES = {
  BAJO: ["Pensamientos de desesperanza ocasionales, sin ideación suicida.", "Refiere pensamientos de muerte pasivos hace meses; actualmente los niega."],
  MODERADO: [
    "Ideación pasiva de muerte sin plan ni intento. Se elaboró un plan de seguridad y se informó a un familiar de confianza.",
    "Antecedente de autolesiones superficiales hace un año. Sin conductas recientes; se monitorea en cada sesión.",
  ],
  ALTO: ["Ideación suicida con plan en la primera evaluación. Se coordinó evaluación psiquiátrica urgente y acompañamiento familiar permanente."],
} as const;

// ---------- Notas de evolución ----------

export const MOODS: Record<"adulto" | "nino", readonly string[]> = {
  adulto: [
    "Eutímic{o}",
    "Ansios{o} al inicio, luego más tranquil{o}",
    "Ánimo bajo, llanto al hablar de la semana",
    "Tranquil{o} y participativ{o}",
    "Irritable al inicio, luego receptiv{o}",
    "Cansad{o}, con buena disposición",
    "Animad{o}; reporta una buena semana",
    "Preocupad{o} por un problema familiar",
    "Afecto aplanado, respuestas breves",
    "Comunicativ{o} y colaborador{a}",
  ],
  nino: [
    "Inquiet{o}, se distrae con los juguetes",
    "Tranquil{o} y dispuest{o} al juego",
    "Tímid{o} al inicio, luego participativ{o}",
    "Irritable tras un mal día en el colegio",
    "Alegre y comunicativ{o}",
    "Llorós{o} al separarse de {acomp}",
  ],
};

export const OPENERS: Record<AgeGroup, readonly string[]> = {
  adulto: [
    "Llega puntual y comenta cómo le fue en la semana.",
    "Refiere una semana más tranquila que la anterior.",
    "Comenta que la semana fue complicada por temas de trabajo.",
    "Revisamos la tarea: la completó parcialmente.",
    "Cumplió con la tarea asignada y trae sus registros.",
    "Llega unos minutos tarde por el tráfico; se le nota cansad{o}.",
    "Refiere que tuvo una discusión familiar el fin de semana.",
    "Comenta que aplicó lo trabajado en la sesión anterior.",
  ],
  adolescente: [
    "Llega puntual; comenta que tuvo exámenes esta semana.",
    "Refiere una semana difícil en casa.",
    "Comenta que se sintió mejor con sus amigos.",
    "Revisamos la tarea: cumplió con el registro de emociones.",
    "Llega acompañad{o} de {acomp}, quien espera afuera.",
  ],
  nino: [
    "Llega acompañad{o} de {acomp}, quien comenta cómo fue la semana en casa.",
    "{Acomp} refiere una semana más tranquila en el colegio.",
    "Ingresa con entusiasmo y elige un juego.",
    "{Acomp} comenta que hubo un incidente en el colegio esta semana.",
  ],
};

export const CLOSERS: Record<"adulto" | "nino", readonly string[]> = {
  adulto: [
    "Se muestra receptiv{o} y participa activamente.",
    "Logra identificar avances concretos.",
    "Aún le cuesta aplicar las técnicas fuera de sesión.",
    "Se acuerda continuar con el mismo plan.",
    "Se le nota más segur{o} al hablar del tema.",
    "Se cierra la sesión con un ejercicio de respiración.",
  ],
  nino: ["Se despide content{o} y pregunta cuándo vuelve.", "Se cierra con un juego libre.", "Se dan pautas a {acomp} para la semana."],
};

export const FIRST_SESSION: Record<AgeGroup, string> = {
  adulto:
    "Primera sesión. Se exploró el motivo de consulta y la historia del problema actual. Se explicaron el encuadre y la confidencialidad, y se firmó el consentimiento informado.",
  adolescente:
    "Primera sesión: entrevista breve con {acomp} y luego a solas con {adolescente}. Se explicó la confidencialidad y sus límites, y {acomp} firmó el consentimiento informado.",
  nino: "Entrevista inicial con {acomp} y luego a solas con {nino}. Se recogió información del desarrollo, la familia y el colegio. Se firmó el consentimiento informado.",
};

export const TRANSFER_SESSION =
  "Primera sesión tras el traspaso de tratante. Se revisaron la historia clínica y los objetivos vigentes, y se acordó continuar con el plan de trabajo.";

export const CLOSING_SESSION: Record<"adulto" | "nino", string> = {
  adulto:
    "Sesión de cierre. Se revisaron los logros respecto a los objetivos iniciales y se elaboró un plan de prevención de recaídas. Se acuerda el alta con seguimiento opcional en un mes.",
  nino: "Sesión de cierre con {acomp}. Se revisaron los avances en casa y en el colegio, y se acuerda el alta con un control en dos meses.",
};

export const FIRST_SESSION_FIELDS = {
  topics: "Motivo de consulta y encuadre",
  interventions: "Entrevista clínica",
  homework: "Observar y anotar las situaciones que generan malestar",
  nextSessionPlan: "Completar la evaluación y definir los objetivos terapéuticos.",
} as const;
