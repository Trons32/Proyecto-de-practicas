/**
 * Criterios de asignación académica 2027-1 (SPEC-015), transcritos del
 * documento del Consejo Académico «Criterios de asignación académica 2027-1».
 *
 * Es texto de consulta, no reglas: el motor de cálculo no lo lee. Los topes
 * que el sistema hace cumplir siguen en `catalogos.ts` y en la
 * parametrización; si el documento y el formato discrepan, manda el formato
 * hasta que el administrador cambie el parámetro (con su novedad).
 *
 * Cada semestre llega un documento nuevo: se reemplaza este archivo entero y
 * se cambia `PERIODO_CRITERIOS`. Las celdas vacías del original van como "".
 */

export const PERIODO_CRITERIOS = "2027-1";

export type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "subtitulo"; texto: string }
  | { tipo: "lista"; items: string[] }
  | { tipo: "nota"; texto: string }
  | {
      tipo: "tabla";
      titulo: string;
      columnas: string[];
      filas: string[][];
      /** Filas que el original usa como separador de grupo. */
      grupos?: Record<number, string>;
      pie?: string;
    };

export type SeccionCriterios = {
  id: string;
  numero: string;
  titulo: string;
  bloques: Bloque[];
};

export const CRITERIOS: SeccionCriterios[] = [
  {
    id: "fundamentacion",
    numero: "",
    titulo: "Fundamentación",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Las actividades de los docentes están reguladas en el artículo 7º del Estatuto Docente: «El Consejo Académico de la Corporación establecerá semestralmente, los criterios de Asignación Académica de los docentes, los cuales son determinados de conformidad con el plan de trabajo o portafolio docente de cada profesor y el plan de acción de la Facultad correspondiente. Esta asignación debe considerar las distintas funciones que a nombre y en beneficio de la Corporación Universitaria del Caribe–CECAR, ejecuten los profesores, como docencia, investigación, extensión, proyección social, gestión académica y formación».",
      },
      {
        tipo: "parrafo",
        texto:
          "Los criterios corresponden al período 2027-1 y organizan la labor docente en pregrado presencial, a distancia tradicional y virtual; también son insumo para actualizar los criterios de la oferta posgradual.",
      },
      {
        tipo: "parrafo",
        texto:
          "Las métricas de asignación de horas directas a docencia, investigación, extensión y proyección social responden a los indicadores de calidad académica y a las necesidades de fortalecimiento de los programas, en materia de aseguramiento de la calidad.",
      },
    ],
  },
  {
    id: "generales",
    numero: "I",
    titulo: "Criterios generales",
    bloques: [
      {
        tipo: "lista",
        items: [
          "Artículo 2.5.3.2.3.2.8 del Decreto 1330 de 2019: cada programa debe contar con un grupo de profesores que, en número, desarrollo pedagógico, nivel de formación, experiencia, vinculación y dedicación, permitan el proceso formativo y las funciones de docencia, investigación y extensión, en coherencia con la modalidad y el nivel del programa.",
          "La asignación responde a la concepción integral de las funciones sustantivas y se realiza conforme al artículo 7º del Estatuto Docente, según el plan de trabajo o portafolio de cada profesor y el plan de acción de la Facultad.",
          "La asignación debe ser revisada y avalada por la Vicerrectoría Académica antes de presentarse al Consejo Académico para su aval y remisión a Junta Directiva, previa revisión del Comité Académico de ese órgano.",
          "Toda asignación incluye la dedicación docente y el tiempo del trabajo complementario: preparación de clases, atención a estudiantes, comunidades académicas y apoyo académico-administrativo según las necesidades del programa.",
        ],
      },
      { tipo: "subtitulo", texto: "Revisión previa" },
      {
        tipo: "lista",
        items: [
          "Revisar la planta docente de cada programa: viabilidad, relación docente según dedicación, proyección de grupos y relación estudiante–docente, con la información de la Coordinación de Estadística.",
          "Tener en cuenta las reformas curriculares (primer semestre) y los perfiles docentes.",
          "La proyección queda sujeta a la dedicación total de horas según el tiempo establecido para docentes con clases y las descargas de los roles.",
          "Considerar la planta requerida para los planes de transición y los programas con oferta anual.",
          "Las asignaciones de programas EAD y virtuales se envían con copia a la Dirección de EAD y Virtualidad, para revisar la viabilidad financiera.",
        ],
      },
      { tipo: "subtitulo", texto: "Estudiantes por curso" },
      {
        tipo: "lista",
        items: [
          "Competencias Comunicativas I y II (antes Taller de lenguas): 2 créditos, 4 encuentros presenciales de 2 horas en el semestre, programados por la Jefatura de Humanidades; obligatorios; 50 estudiantes proyectados.",
          "En programas presenciales los grupos pueden fusionarse atendiendo la modalidad. Los virtuales solo se fusionan con los de distancia tradicional.",
          "Aprendizaje Autónomo (antes Técnicas de aprendizaje): curso optativo en modalidad remota.",
          "Cátedra Fundadores (vida universitaria): curso MOOC para los estudiantes de nuevo ingreso de todas las modalidades.",
          "Ruta de investigación — Investigación I y II: teórico-prácticos de 2 créditos cada uno.",
          "Ruta de inglés — Inglés I, II y III: teórico-prácticos de 2 créditos y 3 horas. En EAD y virtual se unifican por niveles según modalidad.",
        ],
      },
      {
        tipo: "tabla",
        titulo: "Tamaño de grupo según el tipo de curso",
        columnas: ["Tipo de curso", "Estudiantes"],
        filas: [
          ["Talleres de Arquitectura", "20, según la capacidad del aula"],
          ["Cursos teóricos", "Hasta 45, según la capacidad del aula"],
          ["Cursos teórico-prácticos", "Entre 35 y 40"],
          ["Cursos en sala de cómputo", "Entre 30 y 40, según la capacidad"],
          ["Inglés institucional", "Entre 30 y 35"],
          ["Lógica y matemáticas", "Entre 35 y 40"],
          ["Práctica docencia-servicio (práctica I)", "Relación 1/7"],
          [
            "Prácticas de Arquitectura, Trabajo Social, Ciencias del Deporte y Psicología (práctica II)",
            "Entre 15 y 20, por normatividad",
          ],
          ["Psicología, práctica II (este periodo)", "Relación 1/8, por demanda y distribución por áreas"],
        ],
      },
      { tipo: "subtitulo", texto: "Otros criterios" },
      {
        tipo: "lista",
        items: [
          "En lo posible, los cursos de los dos primeros semestres se asignan a docentes de reconocida trayectoria académica, pedagógica y profesional.",
          "Artículo 17 del Estatuto Docente: hasta tres (3) cursos diferentes en el área de formación del docente. Por excepción, en programas con bajo número de estudiantes (baja demanda o programa nuevo), un docente de tiempo completo puede tener hasta cinco (5) cursos diferentes en el periodo.",
          "Los cursos presenciales y a distancia tradicional se desarrollan en el aula física. Se admiten ambientes híbridos por planta física, riesgo ocupacional u otras situaciones avaladas por el Consejo Académico.",
          "Los docentes de planta (TC y MT) cumplen su jornada con asistencia presencial en la sede principal, en Sincelejo.",
          "Por la oferta en registro único, se puede autorizar trabajo remoto a docentes TC, MT o catedráticos según necesidades institucionales.",
          "La participación en órganos institucionales (Junta Directiva, Consejo Académico, Consejo de Facultad, Comité Curricular, Comité de Posgrados…) se acuerda con el Coordinador Académico del programa según frecuencia y duración. Nunca disminuye las horas de docencia directa.",
          "En los periodos intersemestrales parte del tiempo se dedica a cursos y talleres de actualización docente, programados por las Facultades y la Vicerrectoría Académica. El Coordinador informa la participación en el plan de trabajo intersemestral.",
        ],
      },
    ],
  },
  {
    id: "tiempo-completo",
    numero: "II.1",
    titulo: "Docentes de tiempo completo",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "El docente de planta presta sus servicios cuarenta (40) horas semanales, distribuidas en docencia, investigación, extensión, proyección social y gestión académica. Con perfil orientado a la docencia, dicta veinte (20) horas de clase directa y distribuye las otras veinte (20) según su portafolio docente.",
      },
      {
        tipo: "tabla",
        titulo: "Tabla 1 · Horas semanales de trabajo complementario, docentes de planta",
        columnas: ["Dedicación", "Horas semanales"],
        filas: [
          ["Preparación de clases", "5"],
          ["Atención a estudiantes", "5"],
          ["Comunidades académicas", "3"],
          ["Actividades académico-administrativas (portafolio docente)", "7"],
        ],
      },
      {
        tipo: "lista",
        items: [
          "Las horas de apoyo académico-administrativo concertadas en el portafolio dependen del número de roles y de las horas disponibles según los cursos asignados.",
          "Con menos de veinte (20) horas de clase, la preparación y la atención a estudiantes son la mitad de las horas de clase asignadas, y las comunidades académicas entre 1 y 3 horas.",
        ],
      },
    ],
  },
  {
    id: "investigadores",
    numero: "II.1.1",
    titulo: "Docentes investigadores",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "La descarga por investigación sigue el modelo de gestión por proyectos/productos: depende de la tipología de los productos a cargo, la vinculación a proyectos y los roles ejercidos. Para 2027-1 se otorga según los proyectos aprobados en la Convocatoria Interna vigente.",
      },
      {
        tipo: "tabla",
        titulo: "Tabla 2 · Distribución de horas, docentes investigadores",
        columnas: [
          "Horas directas de clase",
          "Horas de investigación",
          "Horas complementarias",
          "Preparación, atención y comunidades",
        ],
        filas: [
          ["16", "4", "Hasta 7", "Hasta 13"],
          ["18", "2", "Hasta 5", "Hasta 15"],
        ],
      },
      {
        tipo: "tabla",
        titulo: "Tabla 3 · Roles y horas de descarga de docentes investigadores",
        columnas: ["Rol", "Horas directas de clase", "Descarga directa", "Horas administrativas", "Observación"],
        filas: [
          ["Investigador principal de proyecto con financiación interna", "16", "4", "20", ""],
          ["Coinvestigador con financiación interna", "18", "2", "20", ""],
          [
            "Director de grupo de investigación",
            "17–16",
            "3–4",
            "20",
            "El Coordinador de Investigación que además sea investigador en proyectos de financiación interna usa las horas complementarias. Si el proyecto Minciencias fija las horas de descarga, se reconoce lo que determine el contrato.",
          ],
          ["Coordinador de investigación de Facultad", "16", "4", "20", ""],
          ["Investigador principal de proyecto con financiación Minciencias", "14", "6", "20", ""],
          ["Director científico de macroproyecto con financiación Minciencias", "12", "8", "20", ""],
          ["Coinvestigador de proyecto con financiación Minciencias", "12", "8", "", ""],
          ["Tutor Joven Investigador Minciencias (distinto a convocatoria interna)", "18", "2", "", ""],
          [
            "Director de semillero de investigación",
            "",
            "3",
            "",
            "Forma parte de los requerimientos de los proyectos de convocatoria interna.",
          ],
          ["Editor de revista", "", "", "20", ""],
        ],
      },
      {
        tipo: "parrafo",
        texto:
          "Las descargas por proyecto dependen de los proyectos aprobados en la convocatoria interna y del mecanismo en que participó el docente, según los productos a obtener:",
      },
      {
        tipo: "lista",
        items: [
          "Mecanismo 1: máximo cinco (5) investigadores de la institución y dos (2) externos.",
          "Mecanismo 2: máximo cuatro (4) investigadores de la institución y dos (2) externos.",
          "Mecanismo 3: máximo cuatro (4) investigadores de la institución y dos (2) externos.",
        ],
      },
    ],
  },
  {
    id: "academico-administrativos",
    numero: "II.1.2",
    titulo: "Funciones académico-administrativas",
    bloques: [
      { tipo: "parrafo", texto: "Los docentes de planta en estos cargos tienen la siguiente dedicación a la docencia:" },
      {
        tipo: "lista",
        items: [
          "Decanos: 3–4 horas semanales (un curso).",
          "Coordinadores académicos de programa: 3–8 horas semanales.",
          "Jefes de departamento: 3–8 horas semanales.",
          "Coordinadores académicos de especializaciones: 12–14 horas en pregrado presencial; 3–6 horas en las coordinaciones que amplían la oferta de cursos coterminales y la operación de maestrías. Se distribuyen según los programas de especialización y coterminales ofertados, la matrícula y las funciones del rol. Se suprime el rol de docente de apoyo a maestrías.",
          "Especialización en Psicología Clínica: una coordinadora académica con perfil clínico; sus horas salen del tiempo administrativo.",
          "Docentes con cargos de dirección administrativa o dedicados regularmente a actividades misionales: entre 2 y 3 horas de clase semanales. El Consejo Académico puede aprobar dedicación total al cargo por un periodo determinado.",
        ],
      },
    ],
  },
  {
    id: "medio-tiempo",
    numero: "II.1.3",
    titulo: "Docentes de medio tiempo",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "El docente de medio tiempo presta sus servicios veinte (20) horas semanales. Con perfil orientado a la docencia, dicta diez (10) horas de clase directa y distribuye las otras diez (10) según su portafolio docente.",
      },
      {
        tipo: "tabla",
        titulo: "Tabla 4 · Horas semanales de trabajo complementario, medio tiempo",
        columnas: ["Dedicación", "Horas semanales"],
        filas: [
          ["Preparación de clases", "2,5"],
          ["Atención a estudiantes", "2,5"],
          ["Comunidades académicas", "2"],
          ["Actividades académico-administrativas (portafolio docente)", "3"],
        ],
      },
      {
        tipo: "parrafo",
        texto:
          "El apoyo académico-administrativo depende de los roles y de las horas disponibles. En lo posible, un solo rol de apoyo por docente, con un mínimo de 5 y un máximo de 7 horas semanales.",
      },
    ],
  },
  {
    id: "roles",
    numero: "II.2",
    titulo: "Asignación según rol",
    bloques: [
      {
        tipo: "tabla",
        titulo: "Tabla 5 · Asignación académica de docentes de planta según rol",
        columnas: ["Rol", "Horas directas de clase", "Descarga directa", "Horas administrativas", "Observación"],
        grupos: { 0: "Roles con descargas directas" },
        filas: [
          [
            "Decano",
            "3–4 (1 curso)",
            "17–16",
            "20",
            "Decanos, coordinadores académicos de pregrado y jefes de departamento tienen al menos un curso en el periodo, aunque estén vinculados a un proyecto de investigación.",
          ],
          ["Coordinador académico de pregrado y jefe de departamento", "3–8", "17–12", "20", ""],
          [
            "Coordinador académico de especializaciones",
            "12–14 (3–6 en coordinaciones con coterminales y maestrías)",
            "8–6",
            "20",
            "Según los programas de especialización y coterminales, la matrícula y las funciones del rol. Se suprime el rol de docente de apoyo a maestrías. Psicología Clínica: coordinadora con perfil clínico, horas del tiempo administrativo.",
          ],
          [
            "Docente de apoyo a la coordinación académica",
            "15",
            "5",
            "20",
            "Se asigna según el número de estudiantes del programa (5 horas de descarga o 2 cursos). Si es investigador principal o coinvestigador en proyecto de financiación interna, asume esas horas dentro de las 20 de trabajo complementario.",
          ],
          ["Coordinador de inglés institucional", "8–10", "12–10", "20", ""],
          ["Docente líder de área", "20", "", "20", "Las horas salen de la distribución de horas administrativas."],
          ["Docente líder de área por facultad", "18", "2", "20", "Solo un docente líder por facultad."],
          [
            "Docente de apoyo a inclusión",
            "10–12",
            "10–8",
            "20",
            "Apoya la ruta de atención a la población estudiantil diversa: acompañamiento y seguimiento a los planes de ajustes razonables.",
          ],
          [
            "Docente de apoyo al Centro de Excelencia Académica",
            "18",
            "2",
            "20",
            "Si tiene descarga por investigación, las horas se cargan al tiempo administrativo.",
          ],
          [
            "Docente TC (docencia plena)",
            "20",
            "",
            "20",
            "5 h de preparación y 5 h de atención según número y naturaleza de los cursos; 3 h de comunidades académicas; 7 h académico-administrativas (proyección social, autoevaluación, acreditación, graduados, asesoría de prácticas, evaluación del aprendizaje, TAE, internacionalización, investigación, Saber Pro, entre otras).",
          ],
          [
            "Docente MT (docencia plena)",
            "10",
            "",
            "10",
            "2,5 h de atención y 2,5 h de preparación según número y naturaleza de los cursos; 2 h de comunidades de aprendizaje; 3 h académico-administrativas.",
          ],
          [
            "Asesor del consultorio jurídico",
            "10",
            "10",
            "20",
            "Las horas de clase son docencia en asesorías, seminarios de práctica forense, clínica y brigadas jurídicas; las 20 académico-administrativas, audiencias de conciliación y apoyo a proyectos de investigación e intervención.",
          ],
          [
            "Coordinador de práctica de programa",
            "12–18",
            "2–8",
            "20",
            "Proporcional a los estudiantes en práctica: menos de 50 → 2 h; 51 a 100 → 3 h; 101 a 150 → 5 h; 151 a 200 → 7 h; más de 200 → 8 h.",
          ],
          [
            "Asesor del consultorio psicológico (CAPS)",
            "21",
            "",
            "20",
            "Cada asesor atiende 3 grupos de 7 estudiantes en práctica clínica docencia-servicio. Debe contar con experiencia clínica.",
          ],
          ["Coordinador del consultorio psicológico", "7–12", "13–8", "20", ""],
          ["Coordinador de centros y consultorios de proyección social", "7–12", "13–8", "20", ""],
          ["Docentes con actividades de extensión y proyección social", "20", "", "20", ""],
          ["Docente coordinador de laboratorios", "12", "8", "20", ""],
          ["Asesor del Centro de Emprendimiento", "16", "4", "20", ""],
          ["Coordinador del Centro de Emprendimiento", "17", "3", "20", ""],
          [
            "Docentes de los departamentos de Humanidades y Ciencias Básicas",
            "18",
            "2",
            "20",
            "Las 2 horas de descarga son para quienes apoyan el Centro de Excelencia Académica.",
          ],
        ],
      },
      {
        tipo: "nota",
        texto:
          "En la tabla original el coordinador de práctica figura con descarga «2-18»; aquí se lee 2–8, que es lo que da la escala por estudiantes. Confírmelo con la Vicerrectoría si necesita la cifra exacta.",
      },
    ],
  },
  {
    id: "catedraticos",
    numero: "II.3",
    titulo: "Docentes catedráticos",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Artículo 18 del Estatuto Docente: el catedrático se contrata ocasionalmente en cada periodo para dictar entre seis (6) y doce (12) horas de clase semanales, y cumple los productos básicos de desempeño del portafolio.",
      },
      {
        tipo: "parrafo",
        texto:
          "Se le reconocen las horas de docencia oficiales de los cursos que orienta. Reuniones, comités, preparación de clases, atención a estudiantes, evaluaciones, diferidos y habilitaciones se consideran incluidos en su contrato.",
      },
      {
        tipo: "parrafo",
        texto:
          "Los catedráticos con vinculación a dependencias administrativas dictan entre seis (6) y nueve (9) horas, en horario que no coincida con su jornada administrativa, y según su formación, experiencia y trayectoria.",
      },
    ],
  },
  {
    id: "tutores-distancia",
    numero: "II.4.1",
    titulo: "Tutores a distancia tradicional",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "La asignación de docentes y tutores a distancia y virtuales atiende las necesidades del programa, la oferta, la matrícula, la dedicación contractual y los lineamientos institucionales, con las particularidades de cada modalidad.",
      },
      {
        tipo: "parrafo",
        texto:
          "El tutor a distancia tradicional tiene entre tres (3) y cinco (5) cursos por bloque. Las horas por curso dependen de los créditos, salvo las rutas institucionales (investigación, emprendimiento e inglés) y las prácticas, que tienen intensidad fija. Cada encuentro sincrónico presencial dura dos (2) horas; el total es esa intensidad por el número de encuentros del bloque.",
      },
      {
        tipo: "tabla",
        titulo: "Tabla 10 · Horas de los tutores según créditos y encuentros",
        columnas: ["Créditos del curso", "Encuentros", "Horas semestrales"],
        filas: [
          ["1", "3", "6"],
          ["2", "6", "12"],
          ["3", "8", "16"],
          ["4", "9", "18"],
          ["Inglés, prácticas profesionales, investigación, emprendimiento", "12", "24"],
        ],
      },
      {
        tipo: "nota",
        texto:
          "Por la reapertura proyectada de algunos Centros de Atención Tutorial (CAT), un tutor puede tener cursos en distintas sedes de su programa; la institución garantiza la carga mínima para que su remuneración alcance la base salarial: mínimo 38 horas por bloque y 75 por periodo. Los cursos de dos (2) créditos se programan concentrados en un único bloque.",
      },
    ],
  },
  {
    id: "tutores-virtual",
    numero: "II.4.2",
    titulo: "Tutores y docentes virtuales",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Los tutores de pregrado virtual tienen entre tres (3) y cinco (5) cursos por bloque; el mínimo de tres garantiza la base de cotización a salud y pensión. Las horas por curso dependen de los estudiantes y los créditos, y cada bloque son ocho (8) semanas.",
      },
      {
        tipo: "tabla",
        titulo: "Tabla 7 · Horas por bloque según estudiantes",
        columnas: ["Estudiantes", "Curso de 1–2 créditos (h/bloque)", "Curso de 3–6 créditos (h/bloque)"],
        filas: [
          ["1–5", "4", "7"],
          ["6–10", "7", "10"],
          ["11–15", "9", "15"],
          ["16–20", "14", "20"],
          ["21–25", "18", "25"],
          ["26–40", "24", "30"],
          ["41–70", "38", "40"],
          ["71–100", "45", "50"],
          ["101–125", "54", "60"],
          ["126–150", "63", "70"],
          ["151–175", "72", "80"],
          ["176–200", "81", "90"],
        ],
      },
      { tipo: "subtitulo", texto: "Docentes de planta en la modalidad virtual" },
      {
        tipo: "parrafo",
        texto:
          "La asignación de TC y MT considera las necesidades de los programas de la facultad, la matrícula proyectada, los perfiles y la dedicación. Con docencia plena, el TC cumple veinte (20) horas equivalentes semanales y el MT diez (10), descontando las descargas autorizadas.",
      },
      {
        tipo: "tabla",
        titulo: "Tabla 8 · Horas equivalentes semanales según estudiantes por curso",
        columnas: ["Estudiantes por curso", "Horas semanales por curso", "Cursos estimados por bloque (8 semanas)"],
        filas: [
          ["1 a 25", "2", "7"],
          ["26 a 50", "3", "6 a 7"],
          ["51 a 75", "4", "5"],
          ["76 a 100", "5", "4"],
          ["101 a 200", "6 a 9", "2 a 3"],
          ["201 a 300", "10 a 13", "1 a 2"],
          ["301 a 400", "14 a 17", "1 a 2"],
        ],
      },
      {
        tipo: "lista",
        items: [
          "Un TC con docencia plena puede tener, como criterio ordinario, hasta siete (7) cursos por bloque.",
          "Los cursos virtuales tienen encuentros sincrónicos cada 15 días, de al menos una (1) hora. Forman parte del acompañamiento y no generan horas adicionales.",
          "El docente fija un horario de atención; se sugiere la franja de 5:00 p. m. a 7:00 p. m.",
        ],
      },
    ],
  },
  {
    id: "coexistencia",
    numero: "III",
    titulo: "Coexistencia de contratos",
    bloques: [
      {
        tipo: "parrafo",
        texto:
          "Los docentes de planta pueden tener cursos fuera de su contrato principal, en diplomados o posgrados; y los administrativos, en pregrado o posgrado en jornada contraria. Máximo dos (2) en un mismo periodo académico.",
      },
    ],
  },
  {
    id: "referencias",
    numero: "",
    titulo: "Referencias",
    bloques: [
      {
        tipo: "lista",
        items: [
          "Decreto 1330 de 2019.",
          "Corporación Universitaria del Caribe – CECAR (2014). Estatuto Docente – Acuerdo de Junta Directiva N.° 01 de 2014. Sincelejo.",
          "Corporación Universitaria del Caribe – CECAR (2020). Acuerdo de Sala de Fundadores N.° 01 de 2020. Sincelejo.",
        ],
      },
    ],
  },
];
