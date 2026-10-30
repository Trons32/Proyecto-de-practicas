/**
 * Cifras de periodos anteriores al sistema (SPEC-009).
 * GENERADO por db/generar-historicos.ts desde el consolidado en Excel. No editar a mano.
 *
 * Solo totales: no hay docentes detrás. `null` es "sin dato en el Excel",
 * distinto de 0. Las cifras dudosas se conservan tal cual (ver la spec).
 */

export type ValorHistorico = number | null;
export type Modalidad = "PRESENCIAL" | "DISTANCIA" | "VIRTUAL";

export interface FilaHistorica {
  etiqueta: string;
  /** En el orden de COLUMNAS_CUADRO; HORA_LABOR siempre null: el Excel no la tenía. */
  valores: ValorHistorico[];
  total: ValorHistorico;
  subtotal?: boolean;
}

export interface CuadroHistorico {
  periodo: string;
  /** El encabezado del Excel, que dice si es asignación inicial, con novedades o proyección. */
  etiqueta: string;
  bloques: { titulo: string; filas: FilaHistorica[] }[];
}

export interface ConteoHistorico {
  tc: ValorHistorico;
  mt: ValorHistorico;
  cat: ValorHistorico;
  tutor: ValorHistorico;
  total: ValorHistorico;
}

export interface ProgramaHistorico {
  modalidad: Modalidad;
  facultad: string;
  /** El nombre en el Excel. */
  nombre: string;
  /** El programa del catálogo, si es el mismo sin duda; si no, null. */
  programa: string | null;
  periodos: Record<string, ConteoHistorico>;
}

export const HISTORICO_CUADRO: CuadroHistorico[] = [
  {
    "periodo": "2022-1",
    "etiqueta": "2022-1",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              223,
              22,
              170,
              null,
              61,
              50
            ],
            "total": 526
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              3056,
              171,
              1544,
              null,
              3007,
              241
            ],
            "total": 8019
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              110,
              26,
              null,
              null,
              null,
              null
            ],
            "total": 136
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              109,
              22,
              null,
              null,
              null,
              null
            ],
            "total": 131
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              623,
              30,
              7,
              null,
              0,
              0
            ],
            "total": 660
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              26,
              37,
              0,
              null,
              0,
              0
            ],
            "total": 63
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Titular",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          }
        ]
      }
    ]
  },
  {
    "periodo": "2022-2",
    "etiqueta": "2022-2",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              228,
              21,
              177,
              null,
              79,
              25
            ],
            "total": 530
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              3254,
              68,
              57,
              null,
              4995,
              80
            ],
            "total": 8454
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              17,
              6,
              null,
              null,
              null,
              null
            ],
            "total": 23
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              17,
              6,
              null,
              null,
              null,
              null
            ],
            "total": 23
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              539,
              7,
              7,
              null,
              0,
              null
            ],
            "total": 553
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              7,
              0,
              0,
              null,
              0,
              null
            ],
            "total": 7
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Titular",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          }
        ]
      }
    ]
  },
  {
    "periodo": "2023-1",
    "etiqueta": "2023-1",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              236,
              16,
              172,
              null,
              68,
              25
            ],
            "total": 517
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              3033,
              221,
              1523,
              null,
              2924,
              781
            ],
            "total": 8482
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              781,
              35,
              0,
              null,
              0,
              0
            ],
            "total": 816
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              758,
              30,
              0,
              null,
              0,
              0
            ],
            "total": 788
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              619,
              32,
              0,
              null,
              0,
              0
            ],
            "total": 651
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              7592,
              362,
              1497,
              null,
              2924,
              781
            ],
            "total": 13156,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              613,
              22,
              7,
              null,
              0,
              0
            ],
            "total": 642
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              531,
              2,
              0,
              null,
              0,
              0
            ],
            "total": 547
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              1144,
              24,
              7,
              null,
              0,
              0
            ],
            "total": 1175,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              127,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 127
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              404,
              19,
              0,
              null,
              0,
              0
            ],
            "total": 423
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              531,
              19,
              0,
              null,
              0,
              0
            ],
            "total": 550,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              4,
              0,
              14,
              null,
              2,
              1
            ],
            "total": 21
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              26,
              4,
              46,
              null,
              22,
              6
            ],
            "total": 104
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              185,
              11,
              100,
              null,
              39,
              18
            ],
            "total": 353
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              19,
              1,
              10,
              null,
              2,
              0
            ],
            "total": 32
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              2,
              0,
              2,
              null,
              0,
              0
            ],
            "total": 4
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              143,
              6,
              2,
              null,
              0,
              0
            ],
            "total": 151
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              91,
              10,
              7,
              null,
              1,
              2
            ],
            "total": 111
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              2,
              0,
              163,
              null,
              64,
              23
            ],
            "total": 252
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              1,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              60,
              7,
              0,
              null,
              0,
              0
            ],
            "total": 67
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              155,
              6,
              1,
              null,
              0,
              0
            ],
            "total": 162
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              19,
              3,
              0,
              null,
              0,
              0
            ],
            "total": 22
          },
          {
            "etiqueta": "Titular",
            "valores": [
              1,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              1,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              0,
              0,
              70,
              null,
              0,
              0
            ],
            "total": 70
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              0,
              0,
              19,
              null,
              0,
              0
            ],
            "total": 19
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              0,
              0,
              1,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              0,
              0,
              0,
              null,
              65,
              25
            ],
            "total": 90
          }
        ]
      }
    ]
  },
  {
    "periodo": "2023-2",
    "etiqueta": "2023-2",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              231,
              17,
              187,
              null,
              60,
              23
            ],
            "total": 518
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              2756,
              136,
              1917,
              null,
              2556,
              524
            ],
            "total": 7889
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              787,
              36,
              0,
              null,
              0,
              0
            ],
            "total": 823
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              759,
              31,
              0,
              null,
              0,
              0
            ],
            "total": 790
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              583,
              33,
              0,
              null,
              0,
              0
            ],
            "total": 616
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              6735,
              261,
              1926,
              null,
              2556,
              524
            ],
            "total": 12002,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              608,
              18,
              4,
              null,
              0,
              0
            ],
            "total": 630
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              479,
              9,
              0,
              null,
              0,
              0
            ],
            "total": 488
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              1087,
              27,
              4,
              null,
              0,
              0
            ],
            "total": 1118,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              274,
              10,
              0,
              null,
              0,
              0
            ],
            "total": 284
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              584,
              23,
              0,
              null,
              0,
              0
            ],
            "total": 607
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              858,
              33,
              0,
              null,
              0,
              0
            ],
            "total": 891,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              3,
              1,
              15,
              null,
              1,
              0
            ],
            "total": 20
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              23,
              4,
              48,
              null,
              23,
              7
            ],
            "total": 105
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              183,
              11,
              116,
              null,
              35,
              16
            ],
            "total": 361
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              20,
              1,
              6,
              null,
              1,
              0
            ],
            "total": 28
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              2,
              0,
              2,
              null,
              0,
              0
            ],
            "total": 4
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              149,
              5,
              0,
              null,
              0,
              0
            ],
            "total": 154
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              82,
              12,
              4,
              null,
              0,
              0
            ],
            "total": 98
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              0,
              0,
              183,
              null,
              60,
              23
            ],
            "total": 266
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              0,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 0
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              43,
              7,
              0,
              null,
              0,
              0
            ],
            "total": 50
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              169,
              6,
              0,
              null,
              0,
              0
            ],
            "total": 175
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              15,
              1,
              0,
              null,
              0,
              0
            ],
            "total": 16
          },
          {
            "etiqueta": "Titular",
            "valores": [
              1,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              0,
              0,
              86,
              null,
              0,
              0
            ],
            "total": 86
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              0,
              0,
              83,
              null,
              0,
              0
            ],
            "total": 83
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              0,
              0,
              17,
              null,
              0,
              0
            ],
            "total": 17
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              0,
              0,
              1,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              0,
              0,
              0,
              null,
              60,
              23
            ],
            "total": 83
          }
        ]
      }
    ]
  },
  {
    "periodo": "2024-1",
    "etiqueta": "2024-1",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              231,
              16,
              138,
              null,
              52,
              23
            ],
            "total": 460
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              2692,
              130,
              1090,
              null,
              2388,
              484
            ],
            "total": 7397
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              767,
              35,
              7,
              null,
              null,
              null
            ],
            "total": 886
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              751,
              29,
              12,
              null,
              null,
              null
            ],
            "total": 850
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              554,
              32,
              1,
              null,
              null,
              null
            ],
            "total": 660
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              6045,
              240,
              1094,
              null,
              2388,
              461
            ],
            "total": 11166,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              300,
              18,
              6,
              null,
              null,
              null
            ],
            "total": 324
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              370,
              6,
              1,
              null,
              null,
              null
            ],
            "total": 431
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              644,
              23,
              null,
              null,
              null,
              null
            ],
            "total": 743,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              201,
              null,
              19,
              null,
              null,
              null
            ],
            "total": 231
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              339,
              7,
              null,
              null,
              null,
              null
            ],
            "total": 476
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              546,
              8,
              null,
              null,
              null,
              null
            ],
            "total": 25275,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              23,
              1,
              13,
              null,
              2,
              null
            ],
            "total": 19
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              15,
              3,
              27,
              null,
              16,
              6
            ],
            "total": 80
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              165,
              10,
              73,
              null,
              33,
              17
            ],
            "total": 329
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              21,
              1,
              10,
              null,
              1,
              null
            ],
            "total": 29
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              1,
              null,
              13,
              null,
              null,
              null
            ],
            "total": 2
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              127,
              4,
              null,
              null,
              null,
              1
            ],
            "total": 154
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              76,
              11,
              7,
              null,
              null,
              null
            ],
            "total": 99
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              null,
              null,
              112,
              null,
              52,
              22
            ],
            "total": 205
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              34,
              4,
              null,
              null,
              null,
              null
            ],
            "total": 45
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              146,
              8,
              1,
              null,
              null,
              1
            ],
            "total": 176
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              17,
              1,
              null,
              null,
              null,
              null
            ],
            "total": 19
          },
          {
            "etiqueta": "Titular",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              null,
              null,
              46,
              null,
              null,
              null
            ],
            "total": 52
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              null,
              null,
              61,
              null,
              null,
              null
            ],
            "total": 73
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              null,
              null,
              9,
              null,
              null,
              null
            ],
            "total": 9
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              null,
              null,
              null,
              null,
              50,
              22
            ],
            "total": 72
          }
        ]
      }
    ]
  },
  {
    "periodo": "2024-2",
    "etiqueta": "2024-2 (NOVEDADES)",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              213,
              15,
              129,
              null,
              46,
              23
            ],
            "total": 426
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              2831,
              127,
              1143,
              null,
              2284,
              588
            ],
            "total": 6973
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              725,
              35,
              0,
              null,
              0,
              0
            ],
            "total": 760
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              709,
              32,
              0,
              null,
              0,
              0
            ],
            "total": 741
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              573,
              31,
              0,
              null,
              0,
              18
            ],
            "total": 622
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              6353,
              239,
              1146,
              null,
              2284,
              603
            ],
            "total": 10625,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              290,
              14,
              6,
              null,
              0,
              0
            ],
            "total": 310
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              428,
              5,
              0,
              null,
              0,
              0
            ],
            "total": 433
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              718,
              19,
              6,
              null,
              0,
              0
            ],
            "total": 743,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              229,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 229
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              482,
              18,
              0,
              null,
              0,
              0
            ],
            "total": 500
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              711,
              18,
              0,
              null,
              0,
              0
            ],
            "total": 729,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              3,
              1,
              5,
              null,
              2,
              0
            ],
            "total": 11
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              18,
              4,
              26,
              null,
              13,
              8
            ],
            "total": 69
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              170,
              9,
              90,
              null,
              28,
              13
            ],
            "total": 310
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              19,
              1,
              5,
              null,
              3,
              0
            ],
            "total": 28
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              2,
              0,
              1,
              null,
              0,
              0
            ],
            "total": 3
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              149,
              5,
              0,
              null,
              0,
              0
            ],
            "total": 154
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              62,
              9,
              5,
              null,
              0,
              0
            ],
            "total": 76
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              1,
              1,
              122,
              null,
              46,
              23
            ],
            "total": 193
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              0,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 0
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              34,
              4,
              0,
              null,
              0,
              4
            ],
            "total": 42
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              155,
              6,
              4,
              null,
              0,
              0
            ],
            "total": 165
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              19,
              3,
              0,
              null,
              0,
              0
            ],
            "total": 22
          },
          {
            "etiqueta": "Titular",
            "valores": [
              0,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 0
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              0,
              1,
              42,
              null,
              0,
              0
            ],
            "total": 43
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              0,
              0,
              70,
              null,
              0,
              0
            ],
            "total": 70
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              0,
              0,
              8,
              null,
              0,
              0
            ],
            "total": 8
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              0,
              0,
              1,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              1,
              1,
              0,
              null,
              46,
              19
            ],
            "total": 67
          }
        ]
      }
    ]
  },
  {
    "periodo": "2025-1",
    "etiqueta": "2025-1 (NOVEDADES)",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              203,
              13,
              126,
              null,
              41,
              20
            ],
            "total": 403
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              2780,
              118,
              1006,
              null,
              1892,
              571
            ],
            "total": 6367
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              730,
              25,
              6,
              null,
              0,
              0
            ],
            "total": 761
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              720,
              26,
              6,
              null,
              0,
              0
            ],
            "total": 752
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              542,
              26,
              5,
              null,
              0,
              9
            ],
            "total": 582
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              5942,
              203,
              1007,
              null,
              1934,
              580
            ],
            "total": 9666,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              192,
              10,
              6,
              null,
              0,
              0
            ],
            "total": 208
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              354,
              12,
              2,
              null,
              0,
              0
            ],
            "total": 368
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              542,
              22,
              5,
              null,
              0,
              0
            ],
            "total": 569,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              187,
              0,
              2,
              null,
              0,
              0
            ],
            "total": 189
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              475,
              6,
              1,
              null,
              0,
              0
            ],
            "total": 482
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              661,
              6,
              0,
              null,
              0,
              0
            ],
            "total": 667,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              3,
              1,
              5,
              null,
              2,
              0
            ],
            "total": 11
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              17,
              2,
              22,
              null,
              8,
              6
            ],
            "total": 55
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              156,
              9,
              81,
              null,
              29,
              14
            ],
            "total": 289
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              20,
              1,
              7,
              null,
              2,
              0
            ],
            "total": 30
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              2,
              0,
              2,
              null,
              0,
              0
            ],
            "total": 4
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              145,
              5,
              0,
              null,
              0,
              0
            ],
            "total": 150
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              51,
              7,
              6,
              null,
              0,
              1
            ],
            "total": 65
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              1,
              1,
              111,
              null,
              41,
              19
            ],
            "total": 173
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              0,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 0
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              31,
              2,
              0,
              null,
              0,
              5
            ],
            "total": 38
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              143,
              7,
              4,
              null,
              0,
              0
            ],
            "total": 154
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              17,
              3,
              0,
              null,
              0,
              0
            ],
            "total": 20
          },
          {
            "etiqueta": "Titular",
            "valores": [
              1,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              0,
              0,
              40,
              null,
              0,
              0
            ],
            "total": 40
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              0,
              0,
              60,
              null,
              0,
              0
            ],
            "total": 60
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              0,
              0,
              10,
              null,
              0,
              0
            ],
            "total": 10
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              0,
              0,
              0,
              null,
              0,
              0
            ],
            "total": 0
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              1,
              1,
              0,
              null,
              41,
              15
            ],
            "total": 58
          }
        ]
      }
    ]
  },
  {
    "periodo": "2025-2",
    "etiqueta": "2025-2 (PROYECCIÓN)",
    "bloques": [
      {
        "titulo": "Distribución por función sustantiva",
        "filas": [
          {
            "etiqueta": "Total docentes",
            "valores": [
              203,
              12,
              104,
              null,
              39,
              23
            ],
            "total": 381
          },
          {
            "etiqueta": "Horas semanales dedicadas a docencia directa",
            "valores": [
              2586,
              101,
              997,
              null,
              1815,
              533
            ],
            "total": 6032
          },
          {
            "etiqueta": "Preparación de clases",
            "valores": [
              684,
              29,
              3,
              null,
              null,
              10
            ],
            "total": 726
          },
          {
            "etiqueta": "Atención a estudiantes",
            "valores": [
              675,
              26,
              3,
              null,
              null,
              10
            ],
            "total": 714
          },
          {
            "etiqueta": "Comunidades de aprendizaje",
            "valores": [
              385,
              24,
              3,
              null,
              null,
              null
            ],
            "total": 412
          },
          {
            "etiqueta": "Dedicación total función docencia",
            "valores": [
              5876,
              198,
              1017,
              null,
              1815,
              553
            ],
            "total": 9459,
            "subtotal": true
          },
          {
            "etiqueta": "Descargas de investigación",
            "valores": [
              254,
              12,
              3,
              null,
              null,
              null
            ],
            "total": 269
          },
          {
            "etiqueta": "Horas complementarias para investigación",
            "valores": [
              230,
              4,
              null,
              null,
              null,
              null
            ],
            "total": 234
          },
          {
            "etiqueta": "Total horas de investigación",
            "valores": [
              484,
              16,
              3,
              null,
              null,
              null
            ],
            "total": 503,
            "subtotal": true
          },
          {
            "etiqueta": "Horas directas semanales dedicadas a extensión o proyección social",
            "valores": [
              152,
              2,
              null,
              null,
              null,
              null
            ],
            "total": 154
          },
          {
            "etiqueta": "Horas administrativas dedicadas a extensión y proyección social",
            "valores": [
              282,
              3,
              null,
              null,
              null,
              null
            ],
            "total": 285
          },
          {
            "etiqueta": "Total horas de extensión y proyección social",
            "valores": [
              434,
              5,
              null,
              null,
              null,
              null
            ],
            "total": 439,
            "subtotal": true
          }
        ]
      },
      {
        "titulo": "Distribución por nivel de formación",
        "filas": [
          {
            "etiqueta": "Pregrado",
            "valores": [
              2,
              null,
              5,
              null,
              2,
              null
            ],
            "total": 9
          },
          {
            "etiqueta": "Especialistas",
            "valores": [
              16,
              3,
              14,
              null,
              7,
              7
            ],
            "total": 47
          },
          {
            "etiqueta": "Magíster",
            "valores": [
              159,
              8,
              77,
              null,
              22,
              15
            ],
            "total": 281
          },
          {
            "etiqueta": "Doctor",
            "valores": [
              23,
              1,
              7,
              null,
              4,
              1
            ],
            "total": 36
          },
          {
            "etiqueta": "Posdoctor",
            "valores": [
              2,
              null,
              1,
              null,
              null,
              null
            ],
            "total": 3
          }
        ]
      },
      {
        "titulo": "Distribución por tipo de contrato",
        "filas": [
          {
            "etiqueta": "Término indefinido",
            "valores": [
              163,
              7,
              1,
              null,
              null,
              null
            ],
            "total": 171
          },
          {
            "etiqueta": "Término fijo",
            "valores": [
              40,
              4,
              null,
              null,
              null,
              1
            ],
            "total": 45
          },
          {
            "etiqueta": "Labor contratada (tutores y cátedra)",
            "valores": [
              null,
              1,
              103,
              null,
              39,
              22
            ],
            "total": 165
          }
        ]
      },
      {
        "titulo": "Distribución por categoría en el escalafón",
        "filas": [
          {
            "etiqueta": "Docente en formación",
            "valores": [
              null,
              null,
              null,
              null,
              null,
              null
            ],
            "total": null
          },
          {
            "etiqueta": "Auxiliar",
            "valores": [
              22,
              2,
              3,
              null,
              null,
              8
            ],
            "total": 35
          },
          {
            "etiqueta": "Asistente",
            "valores": [
              152,
              6,
              1,
              null,
              null,
              null
            ],
            "total": 159
          },
          {
            "etiqueta": "Asociado",
            "valores": [
              17,
              3,
              null,
              null,
              null,
              null
            ],
            "total": 20
          },
          {
            "etiqueta": "Titular",
            "valores": [
              5,
              null,
              null,
              null,
              null,
              null
            ],
            "total": 5
          },
          {
            "etiqueta": "Categoría I",
            "valores": [
              null,
              null,
              32,
              null,
              null,
              null
            ],
            "total": 32
          },
          {
            "etiqueta": "Categoría II",
            "valores": [
              2,
              null,
              56,
              null,
              null,
              null
            ],
            "total": 58
          },
          {
            "etiqueta": "Categoría III",
            "valores": [
              null,
              null,
              11,
              null,
              null,
              null
            ],
            "total": 11
          },
          {
            "etiqueta": "Categoría IV",
            "valores": [
              null,
              null,
              1,
              null,
              null,
              null
            ],
            "total": 1
          },
          {
            "etiqueta": "Categoría única",
            "valores": [
              null,
              1,
              null,
              null,
              39,
              15
            ],
            "total": 55
          }
        ]
      }
    ]
  }
];

export const HISTORICO_PROGRAMAS: ProgramaHistorico[] = [
  {
    "modalidad": "PRESENCIAL",
    "facultad": "DERECHO",
    "nombre": "DERECHO",
    "programa": "DERECHO",
    "periodos": {
      "2022-2": {
        "tc": 27,
        "mt": 1,
        "cat": 31,
        "tutor": null,
        "total": 59
      },
      "2023-1": {
        "tc": 28,
        "mt": 1,
        "cat": 26,
        "tutor": null,
        "total": 55
      },
      "2023-2": {
        "tc": 25,
        "mt": 1,
        "cat": 28,
        "tutor": null,
        "total": 54
      },
      "2024-1": {
        "tc": 25,
        "mt": 1,
        "cat": 24,
        "tutor": null,
        "total": 50
      },
      "2024-2": {
        "tc": 24,
        "mt": 1,
        "cat": 24,
        "tutor": null,
        "total": 49
      },
      "2025-1": {
        "tc": 25,
        "mt": 1,
        "cat": 19,
        "tutor": null,
        "total": 45
      },
      "2025-2": {
        "tc": 24,
        "mt": 1,
        "cat": 18,
        "tutor": null,
        "total": 43
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FACEA",
    "nombre": "ECONOMIA",
    "programa": "ECONOMÍA",
    "periodos": {
      "2022-2": {
        "tc": 6,
        "mt": 0,
        "cat": 7,
        "tutor": null,
        "total": 13
      },
      "2023-1": {
        "tc": 6,
        "mt": 0,
        "cat": 7,
        "tutor": null,
        "total": 13
      },
      "2023-2": {
        "tc": 6,
        "mt": 0,
        "cat": 8,
        "tutor": null,
        "total": 14
      },
      "2024-1": {
        "tc": 6,
        "mt": null,
        "cat": 6,
        "tutor": null,
        "total": 12
      },
      "2024-2": {
        "tc": 6,
        "mt": 0,
        "cat": 6,
        "tutor": null,
        "total": null
      },
      "2025-1": {
        "tc": 4,
        "mt": 0,
        "cat": 8,
        "tutor": null,
        "total": 12
      },
      "2025-2": {
        "tc": 4,
        "mt": null,
        "cat": 8,
        "tutor": null,
        "total": 12
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN DE EMPRESAS",
    "programa": "AMDINISTRACIÓN DE EMPRESAS PRESENCIAL",
    "periodos": {
      "2022-2": {
        "tc": 16,
        "mt": 0,
        "cat": 5,
        "tutor": null,
        "total": 21
      },
      "2023-1": {
        "tc": 15,
        "mt": 0,
        "cat": 7,
        "tutor": null,
        "total": 22
      },
      "2023-2": {
        "tc": 15,
        "mt": 0,
        "cat": 8,
        "tutor": null,
        "total": 23
      },
      "2024-1": {
        "tc": 15,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 18
      },
      "2024-2": {
        "tc": 15,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 18
      },
      "2025-1": {
        "tc": 15,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 19
      },
      "2025-2": {
        "tc": 16,
        "mt": null,
        "cat": 4,
        "tutor": null,
        "total": 20
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FACEA",
    "nombre": "CONTADURIA SINCELEJO",
    "programa": "CONTADURÍA PÚBLICA PRESENCIAL",
    "periodos": {
      "2022-2": {
        "tc": 9,
        "mt": 0,
        "cat": 7,
        "tutor": null,
        "total": 16
      },
      "2023-1": {
        "tc": 12,
        "mt": 0,
        "cat": 11,
        "tutor": null,
        "total": 23
      },
      "2023-2": {
        "tc": 11,
        "mt": 0,
        "cat": 11,
        "tutor": null,
        "total": 22
      },
      "2024-1": {
        "tc": 12,
        "mt": 0,
        "cat": 11,
        "tutor": null,
        "total": 23
      },
      "2024-2": {
        "tc": 11,
        "mt": 0,
        "cat": 10,
        "tutor": null,
        "total": 21
      },
      "2025-1": {
        "tc": 11,
        "mt": 0,
        "cat": 9,
        "tutor": null,
        "total": 20
      },
      "2025-2": {
        "tc": 11,
        "mt": null,
        "cat": 9,
        "tutor": null,
        "total": 20
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FACEA",
    "nombre": "CONTADURIA MONTERIA",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 1,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 4
      },
      "2023-1": {
        "tc": 1,
        "mt": 0,
        "cat": 11,
        "tutor": null,
        "total": 12
      },
      "2023-2": {
        "tc": 1,
        "mt": 0,
        "cat": 5,
        "tutor": null,
        "total": 6
      },
      "2024-1": {
        "tc": 1,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 5
      },
      "2024-2": {
        "tc": 1,
        "mt": 0,
        "cat": 2,
        "tutor": null,
        "total": 3
      },
      "2025-1": {
        "tc": 0,
        "mt": 1,
        "cat": 0,
        "tutor": null,
        "total": 1
      },
      "2025-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": null,
        "total": null
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "PSICOLOGÍA",
    "programa": "PSICOLOGÍA",
    "periodos": {
      "2022-2": {
        "tc": 33,
        "mt": 0,
        "cat": 7,
        "tutor": null,
        "total": 40
      },
      "2023-1": {
        "tc": 32,
        "mt": 0,
        "cat": 2,
        "tutor": null,
        "total": 34
      },
      "2023-2": {
        "tc": 31,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 34
      },
      "2024-1": {
        "tc": 26,
        "mt": 0,
        "cat": 1,
        "tutor": null,
        "total": 27
      },
      "2024-2": {
        "tc": 22,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 25
      },
      "2025-1": {
        "tc": 20,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 24
      },
      "2025-2": {
        "tc": 20,
        "mt": null,
        "cat": 3,
        "tutor": null,
        "total": 23
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "TRABAJO SOCIAL",
    "programa": "TRABAJO SOCIAL",
    "periodos": {
      "2022-2": {
        "tc": 21,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 25
      },
      "2023-1": {
        "tc": 22,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 26
      },
      "2023-2": {
        "tc": 22,
        "mt": 0,
        "cat": 5,
        "tutor": null,
        "total": 27
      },
      "2024-1": {
        "tc": 22,
        "mt": 0,
        "cat": 2,
        "tutor": null,
        "total": 24
      },
      "2024-2": {
        "tc": 20,
        "mt": 0,
        "cat": 1,
        "tutor": null,
        "total": 21
      },
      "2025-1": {
        "tc": 18,
        "mt": 0,
        "cat": 2,
        "tutor": null,
        "total": 20
      },
      "2025-2": {
        "tc": 17,
        "mt": null,
        "cat": 2,
        "tutor": null,
        "total": 19
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "CIENCIAS DEL DEPORTE",
    "programa": "CIENCIAS DEL DEPORTE Y LA ACTIVIAD FÍSICA",
    "periodos": {
      "2022-2": {
        "tc": 10,
        "mt": 1,
        "cat": 4,
        "tutor": null,
        "total": 15
      },
      "2023-1": {
        "tc": 11,
        "mt": 1,
        "cat": 3,
        "tutor": null,
        "total": 15
      },
      "2023-2": {
        "tc": 10,
        "mt": 1,
        "cat": 4,
        "tutor": null,
        "total": 15
      },
      "2024-1": {
        "tc": 10,
        "mt": 1,
        "cat": 3,
        "tutor": null,
        "total": 14
      },
      "2024-2": {
        "tc": 10,
        "mt": 1,
        "cat": 2,
        "tutor": null,
        "total": 13
      },
      "2025-1": {
        "tc": 9,
        "mt": 1,
        "cat": 5,
        "tutor": null,
        "total": 15
      },
      "2025-2": {
        "tc": 9,
        "mt": 1,
        "cat": 3,
        "tutor": null,
        "total": 13
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "LICENCIATURA EN LITERATURA Y LENGUA CASTELLANA",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 7,
        "mt": 0,
        "cat": 12,
        "tutor": null,
        "total": 19
      },
      "2023-1": {
        "tc": 7,
        "mt": 0,
        "cat": 9,
        "tutor": null,
        "total": 16
      },
      "2023-2": {
        "tc": 7,
        "mt": 0,
        "cat": 10,
        "tutor": null,
        "total": 17
      },
      "2024-1": {
        "tc": 7,
        "mt": 0,
        "cat": 8,
        "tutor": null,
        "total": 15
      },
      "2024-2": {
        "tc": 6,
        "mt": 0,
        "cat": 8,
        "tutor": null,
        "total": 14
      },
      "2025-1": {
        "tc": 4,
        "mt": 0,
        "cat": 9,
        "tutor": null,
        "total": 13
      },
      "2025-2": {
        "tc": 4,
        "mt": null,
        "cat": 7,
        "tutor": null,
        "total": 11
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "DEP. DE HUMANIDADES",
    "programa": "DEPARTAMENTO DE HUMANIDADES",
    "periodos": {
      "2022-2": {
        "tc": 4,
        "mt": 0,
        "cat": 9,
        "tutor": null,
        "total": 13
      },
      "2023-1": {
        "tc": 6,
        "mt": 0,
        "cat": 9,
        "tutor": null,
        "total": 15
      },
      "2023-2": {
        "tc": 7,
        "mt": 1,
        "cat": 8,
        "tutor": null,
        "total": 16
      },
      "2024-1": {
        "tc": 6,
        "mt": 1,
        "cat": 10,
        "tutor": null,
        "total": 17
      },
      "2024-2": {
        "tc": 6,
        "mt": 1,
        "cat": 8,
        "tutor": null,
        "total": 15
      },
      "2025-1": {
        "tc": 7,
        "mt": 1,
        "cat": 9,
        "tutor": null,
        "total": 16
      },
      "2025-2": {
        "tc": 8,
        "mt": null,
        "cat": null,
        "tutor": null,
        "total": 8
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "INGLÉS INSTITUCIONAL",
    "programa": "INGLÉS INSTITUCIONAL",
    "periodos": {
      "2022-2": {
        "tc": 3,
        "mt": 1,
        "cat": 9,
        "tutor": null,
        "total": 13
      },
      "2023-1": {
        "tc": 1,
        "mt": 1,
        "cat": 13,
        "tutor": null,
        "total": 15
      },
      "2023-2": {
        "tc": 1,
        "mt": 1,
        "cat": 13,
        "tutor": null,
        "total": 15
      },
      "2024-1": {
        "tc": 1,
        "mt": 1,
        "cat": 81,
        "tutor": null,
        "total": 83
      },
      "2024-2": {
        "tc": 0,
        "mt": 1,
        "cat": 10,
        "tutor": null,
        "total": 11
      },
      "2025-1": {
        "tc": 0,
        "mt": 1,
        "cat": 10,
        "tutor": null,
        "total": 11
      },
      "2025-2": {
        "tc": null,
        "mt": 1,
        "cat": 7,
        "tutor": null,
        "total": 8
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "HUMANIDADES",
    "nombre": "LIC. EN PEDAGOGÍA INF.",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 3,
        "mt": 1,
        "cat": 14,
        "tutor": null,
        "total": 18
      },
      "2023-1": {
        "tc": 3,
        "mt": 2,
        "cat": 4,
        "tutor": null,
        "total": 9
      },
      "2023-2": {
        "tc": 3,
        "mt": 2,
        "cat": 4,
        "tutor": null,
        "total": 9
      },
      "2024-1": {
        "tc": 3,
        "mt": 2,
        "cat": 4,
        "tutor": null,
        "total": 9
      },
      "2024-2": {
        "tc": 3,
        "mt": 2,
        "cat": 4,
        "tutor": null,
        "total": 9
      },
      "2025-1": {
        "tc": 3,
        "mt": 1,
        "cat": 3,
        "tutor": null,
        "total": 7
      },
      "2025-2": {
        "tc": 3,
        "mt": 1,
        "cat": 3,
        "tutor": null,
        "total": 7
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FCBIA",
    "nombre": "ING. DE SISTEMAS",
    "programa": "INGENIERÍA DE SISTEMAS",
    "periodos": {
      "2022-2": {
        "tc": 8,
        "mt": 1,
        "cat": 13,
        "tutor": null,
        "total": 22
      },
      "2023-1": {
        "tc": 9,
        "mt": 1,
        "cat": 13,
        "tutor": null,
        "total": 23
      },
      "2023-2": {
        "tc": 8,
        "mt": 1,
        "cat": 15,
        "tutor": null,
        "total": 24
      },
      "2024-1": {
        "tc": 10,
        "mt": 1,
        "cat": 14,
        "tutor": null,
        "total": 25
      },
      "2024-2": {
        "tc": 10,
        "mt": 1,
        "cat": 13,
        "tutor": null,
        "total": 24
      },
      "2025-1": {
        "tc": 10,
        "mt": 1,
        "cat": 14,
        "tutor": null,
        "total": 25
      },
      "2025-2": {
        "tc": 9,
        "mt": 1,
        "cat": 14,
        "tutor": null,
        "total": 24
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FCBIA",
    "nombre": "ING. INDUSTRIAL",
    "programa": "INGENIERÍA INDUSTRIAL",
    "periodos": {
      "2022-2": {
        "tc": 14,
        "mt": 0,
        "cat": 5,
        "tutor": null,
        "total": 19
      },
      "2023-1": {
        "tc": 14,
        "mt": 0,
        "cat": 6,
        "tutor": null,
        "total": 20
      },
      "2023-2": {
        "tc": 14,
        "mt": 0,
        "cat": 6,
        "tutor": null,
        "total": 20
      },
      "2024-1": {
        "tc": 13,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 16
      },
      "2024-2": {
        "tc": 12,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 15
      },
      "2025-1": {
        "tc": 11,
        "mt": 0,
        "cat": 3,
        "tutor": null,
        "total": 14
      },
      "2025-2": {
        "tc": 11,
        "mt": 1,
        "cat": 3,
        "tutor": null,
        "total": 15
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FCBIA",
    "nombre": "ARQUITECTURA",
    "programa": "ARQUITECTURA",
    "periodos": {
      "2022-2": {
        "tc": 21,
        "mt": 0,
        "cat": 19,
        "tutor": null,
        "total": 40
      },
      "2023-1": {
        "tc": 22,
        "mt": 0,
        "cat": 17,
        "tutor": null,
        "total": 39
      },
      "2023-2": {
        "tc": 22,
        "mt": 0,
        "cat": 19,
        "tutor": null,
        "total": 41
      },
      "2024-1": {
        "tc": 21,
        "mt": 0,
        "cat": 15,
        "tutor": null,
        "total": 36
      },
      "2024-2": {
        "tc": 21,
        "mt": 0,
        "cat": 11,
        "tutor": null,
        "total": 32
      },
      "2025-1": {
        "tc": 21,
        "mt": 0,
        "cat": 8,
        "tutor": null,
        "total": 29
      },
      "2025-2": {
        "tc": 21,
        "mt": null,
        "cat": 8,
        "tutor": null,
        "total": 29
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FCBIA",
    "nombre": "CIENCIAS BASICAS",
    "programa": "DEPARTAMENTO DE CIENCIAS BÁSICAS",
    "periodos": {
      "2022-2": {
        "tc": 10,
        "mt": 1,
        "cat": 16,
        "tutor": null,
        "total": 27
      },
      "2023-1": {
        "tc": 10,
        "mt": 1,
        "cat": 19,
        "tutor": null,
        "total": 30
      },
      "2023-2": {
        "tc": 11,
        "mt": 1,
        "cat": 21,
        "tutor": null,
        "total": 33
      },
      "2024-1": {
        "tc": 12,
        "mt": 1,
        "cat": 19,
        "tutor": null,
        "total": 32
      },
      "2024-2": {
        "tc": 11,
        "mt": 1,
        "cat": 17,
        "tutor": null,
        "total": 29
      },
      "2025-1": {
        "tc": 10,
        "mt": 1,
        "cat": 16,
        "tutor": null,
        "total": 27
      },
      "2025-2": {
        "tc": 10,
        "mt": 1,
        "cat": 10,
        "tutor": null,
        "total": 21
      }
    }
  },
  {
    "modalidad": "PRESENCIAL",
    "facultad": "FCBIA",
    "nombre": "DISEÑO INDUSTRIAL",
    "programa": "DISEÑO INDUSTRIAL",
    "periodos": {
      "2022-2": {
        "tc": 3,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 7
      },
      "2023-1": {
        "tc": 3,
        "mt": 0,
        "cat": 5,
        "tutor": null,
        "total": 8
      },
      "2023-2": {
        "tc": 3,
        "mt": 0,
        "cat": 5,
        "tutor": null,
        "total": 8
      },
      "2024-1": {
        "tc": 4,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 8
      },
      "2024-2": {
        "tc": 4,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 8
      },
      "2025-1": {
        "tc": 4,
        "mt": 0,
        "cat": 4,
        "tutor": null,
        "total": 8
      },
      "2025-2": {
        "tc": 4,
        "mt": null,
        "cat": 5,
        "tutor": null,
        "total": 9
      }
    }
  },
  {
    "modalidad": "DISTANCIA",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN DE EMPRESAS EAD",
    "programa": "ADMINISTRACIÓN DE EMPRESAS EAD",
    "periodos": {
      "2022-2": {
        "tc": 4,
        "mt": 0,
        "cat": 0,
        "tutor": 55,
        "total": 59
      },
      "2023-1": {
        "tc": 4,
        "mt": 0,
        "cat": 0,
        "tutor": 40,
        "total": 44
      },
      "2023-2": {
        "tc": 4,
        "mt": 1,
        "cat": 0,
        "tutor": 40,
        "total": 45
      },
      "2024-1": {
        "tc": 5,
        "mt": 1,
        "cat": 0,
        "tutor": 26,
        "total": 32
      },
      "2024-2": {
        "tc": 5,
        "mt": 1,
        "cat": 0,
        "tutor": 31,
        "total": 37
      },
      "2025-1": {
        "tc": 6,
        "mt": 1,
        "cat": 0,
        "tutor": 27,
        "total": 34
      },
      "2025-2": {
        "tc": 6,
        "mt": 1,
        "cat": null,
        "tutor": 24,
        "total": 31
      }
    }
  },
  {
    "modalidad": "DISTANCIA",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN PÚBLICA",
    "programa": "ADMINISTRACIÓN PÚBLICA EAD",
    "periodos": {
      "2022-2": {
        "tc": 1,
        "mt": 1,
        "cat": 0,
        "tutor": 14,
        "total": 16
      },
      "2023-1": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 19,
        "total": 21
      },
      "2023-2": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 10,
        "total": 12
      },
      "2024-1": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 7,
        "total": 9
      },
      "2024-2": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 4,
        "total": 6
      },
      "2025-1": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 4,
        "total": 6
      },
      "2025-2": {
        "tc": 2,
        "mt": null,
        "cat": null,
        "tutor": 4,
        "total": 6
      }
    }
  },
  {
    "modalidad": "DISTANCIA",
    "facultad": "HUMANIDADES",
    "nombre": "LIC. CIENCIAS NATURALES Y EDUCACIÓN AMBIENTAL",
    "programa": "LIC. CIENCIAS NATURALES Y EDUC. AMBIENTAL",
    "periodos": {
      "2022-2": {
        "tc": 4,
        "mt": 2,
        "cat": 0,
        "tutor": 10,
        "total": 16
      },
      "2023-1": {
        "tc": 4,
        "mt": 2,
        "cat": 0,
        "tutor": 9,
        "total": 15
      },
      "2023-2": {
        "tc": 4,
        "mt": 2,
        "cat": 0,
        "tutor": 10,
        "total": 16
      },
      "2024-1": {
        "tc": 4,
        "mt": 2,
        "cat": 0,
        "tutor": 4,
        "total": 10
      },
      "2024-2": {
        "tc": 4,
        "mt": 2,
        "cat": 0,
        "tutor": 11,
        "total": 17
      },
      "2025-1": {
        "tc": 4,
        "mt": 2,
        "cat": 0,
        "tutor": 10,
        "total": 16
      },
      "2025-2": {
        "tc": 4,
        "mt": 2,
        "cat": null,
        "tutor": 11,
        "total": 17
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "FACEA",
    "nombre": "CONTADURÍA  PÚBLICA VIRTUAL",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 1,
        "mt": 0,
        "cat": 0,
        "tutor": 1,
        "total": 2
      },
      "2023-1": {
        "tc": 1,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 4
      },
      "2023-2": {
        "tc": 1,
        "mt": 0,
        "cat": 0,
        "tutor": 2,
        "total": 3
      },
      "2024-1": {
        "tc": 1,
        "mt": null,
        "cat": null,
        "tutor": 3,
        "total": 4
      },
      "2024-2": {
        "tc": 1,
        "mt": 0,
        "cat": 0,
        "tutor": 4,
        "total": 5
      },
      "2025-1": {
        "tc": 1,
        "mt": 0,
        "cat": 0,
        "tutor": 5,
        "total": 6
      },
      "2025-2": {
        "tc": 1,
        "mt": null,
        "cat": null,
        "tutor": 8,
        "total": 9
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN TURÍSTICA",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 2,
        "total": 2
      },
      "2023-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 1,
        "total": 1
      },
      "2023-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": 0
      },
      "2024-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": null
      },
      "2024-2": {
        "tc": null,
        "mt": null,
        "cat": null,
        "tutor": null,
        "total": null
      },
      "2025-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": 0
      },
      "2025-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": null
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN Y NEGOCIOS INTERNACIONALES",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 3
      },
      "2023-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": 0
      },
      "2023-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": 0
      },
      "2024-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": null
      },
      "2024-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 3
      },
      "2025-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": 0
      },
      "2025-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 0,
        "total": null
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN DE EMPRESAS VIRTUAL",
    "programa": "ADMINISTRACIÓN DE EMPRESAS VIRTUAL",
    "periodos": {
      "2022-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 1,
        "total": 1
      },
      "2023-1": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 5
      },
      "2023-2": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 6,
        "total": 8
      },
      "2024-1": {
        "tc": 3,
        "mt": null,
        "cat": null,
        "tutor": 2,
        "total": 5
      },
      "2024-2": {
        "tc": 3,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 6
      },
      "2025-1": {
        "tc": 2,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 5
      },
      "2025-2": {
        "tc": 2,
        "mt": null,
        "cat": 0,
        "tutor": 2,
        "total": 4
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN INFORMÁTICA",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 1,
        "mt": 0,
        "cat": 0,
        "tutor": 5,
        "total": 6
      },
      "2023-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 4,
        "total": 4
      },
      "2023-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 3
      },
      "2024-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 3
      },
      "2024-2": {
        "tc": null,
        "mt": null,
        "cat": null,
        "tutor": null,
        "total": null
      },
      "2025-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 3
      },
      "2025-2": {
        "tc": null,
        "mt": null,
        "cat": null,
        "tutor": 3,
        "total": 3
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "FACEA",
    "nombre": "ADMINISTRACIÓN PÚBLICA",
    "programa": "ADMINISTRACIÓN PÚBLICA VIRTUAL",
    "periodos": {
      "2022-2": {
        "tc": 0,
        "mt": 0,
        "cat": 2,
        "tutor": 4,
        "total": 6
      },
      "2023-1": {
        "tc": 0,
        "mt": 0,
        "cat": 1,
        "tutor": 6,
        "total": 7
      },
      "2023-2": {
        "tc": 0,
        "mt": 0,
        "cat": 1,
        "tutor": 4,
        "total": 5
      },
      "2024-1": {
        "tc": 0,
        "mt": null,
        "cat": null,
        "tutor": 4,
        "total": 4
      },
      "2024-2": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 3,
        "total": 3
      },
      "2025-1": {
        "tc": 0,
        "mt": 0,
        "cat": 0,
        "tutor": 5,
        "total": 5
      },
      "2025-2": {
        "tc": null,
        "mt": null,
        "cat": 0,
        "tutor": 4,
        "total": 4
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "HUMANIDADES",
    "nombre": "LICENCIATURA EN EDUCACIÓN INFANTIL",
    "programa": "LIC. EDUCACIÓN INTANTIL VIRTUAL",
    "periodos": {
      "2022-2": {
        "tc": 12,
        "mt": 7,
        "cat": 9,
        "tutor": 7,
        "total": 35
      },
      "2023-1": {
        "tc": 11,
        "mt": 3,
        "cat": 5,
        "tutor": 6,
        "total": 25
      },
      "2023-2": {
        "tc": 11,
        "mt": 2,
        "cat": 13,
        "tutor": 5,
        "total": 31
      },
      "2024-1": {
        "tc": 8,
        "mt": 2,
        "cat": null,
        "tutor": 8,
        "total": 18
      },
      "2024-2": {
        "tc": 8,
        "mt": 1,
        "cat": 0,
        "tutor": 8,
        "total": 17
      },
      "2025-1": {
        "tc": 8,
        "mt": 1,
        "cat": 0,
        "tutor": 3,
        "total": 12
      },
      "2025-2": {
        "tc": 8,
        "mt": 1,
        "cat": null,
        "tutor": 3,
        "total": 12
      }
    }
  },
  {
    "modalidad": "VIRTUAL",
    "facultad": "HUMANIDADES",
    "nombre": "LICENCIATURA EN INGLÉS",
    "programa": null,
    "periodos": {
      "2022-2": {
        "tc": 8,
        "mt": 4,
        "cat": 0,
        "tutor": 2,
        "total": 14
      },
      "2023-1": {
        "tc": 10,
        "mt": 4,
        "cat": 0,
        "tutor": 2,
        "total": 16
      },
      "2023-2": {
        "tc": 10,
        "mt": 4,
        "cat": 0,
        "tutor": 3,
        "total": 17
      },
      "2024-1": {
        "tc": 8,
        "mt": 3,
        "cat": null,
        "tutor": 3,
        "total": 14
      },
      "2024-2": {
        "tc": 8,
        "mt": 3,
        "cat": 0,
        "tutor": 2,
        "total": 13
      },
      "2025-1": {
        "tc": 9,
        "mt": 1,
        "cat": 0,
        "tutor": 1,
        "total": 11
      },
      "2025-2": {
        "tc": 9,
        "mt": 1,
        "cat": null,
        "tutor": 3,
        "total": 13
      }
    }
  }
];

export const HISTORICO_MODALIDAD: Record<Modalidad, Record<string, Partial<ConteoHistorico>>> = {
  "PRESENCIAL": {
    "2023-1": {
      "tc": 202,
      "mt": 7,
      "cat": 166,
      "tutor": 0
    },
    "2023-2": {
      "tc": 197,
      "mt": 8,
      "cat": 173,
      "tutor": 0
    },
    "2024-1": {
      "tc": 194,
      "mt": 8,
      "cat": 141,
      "tutor": 0
    },
    "2024-2": {
      "tc": 182,
      "mt": 8,
      "cat": 129,
      "tutor": 0
    },
    "2025-1": {
      "tc": 171,
      "mt": 8,
      "cat": 127,
      "tutor": 0
    },
    "2025-2": {
      "tc": 171,
      "mt": 8,
      "cat": 104,
      "tutor": 0
    }
  },
  "DISTANCIA": {
    "2023-1": {
      "tc": 10,
      "mt": 2,
      "cat": 0,
      "tutor": 68
    },
    "2023-2": {
      "tc": 10,
      "mt": 3,
      "cat": 0,
      "tutor": 60
    },
    "2024-1": {
      "tc": 11,
      "mt": 3,
      "cat": 0,
      "tutor": 37
    },
    "2024-2": {
      "tc": 11,
      "mt": 3,
      "cat": 0,
      "tutor": 46
    },
    "2025-1": {
      "tc": 12,
      "mt": 3,
      "cat": null,
      "tutor": 41
    },
    "2025-2": {
      "tc": 10,
      "mt": 3,
      "cat": 0,
      "tutor": 39
    }
  },
  "VIRTUAL": {
    "2023-1": {
      "tc": 24,
      "mt": 7,
      "cat": 6,
      "tutor": 25
    },
    "2023-2": {
      "tc": 24,
      "mt": 6,
      "cat": 14,
      "tutor": 23
    },
    "2024-1": {
      "tc": 20,
      "mt": 5,
      "cat": 0,
      "tutor": 23
    },
    "2024-2": {
      "tc": 20,
      "mt": 4,
      "cat": 0,
      "tutor": 23
    },
    "2025-1": {
      "tc": 20,
      "mt": 2,
      "cat": null,
      "tutor": 20
    },
    "2025-2": {
      "tc": 24,
      "mt": 2,
      "cat": 0,
      "tutor": 23
    }
  }
};

export const HISTORICO_ESTUDIANTES: { periodo: string; docentes: ValorHistorico; estudiantes: ValorHistorico }[] = [
  {
    "periodo": "2022-1",
    "docentes": 526,
    "estudiantes": 9668
  },
  {
    "periodo": "2022-2",
    "docentes": 530,
    "estudiantes": 8988
  },
  {
    "periodo": "2023-1",
    "docentes": 517,
    "estudiantes": 8175
  },
  {
    "periodo": "2023-2",
    "docentes": 518,
    "estudiantes": 7574
  },
  {
    "periodo": "2024-1",
    "docentes": 460,
    "estudiantes": 7285
  },
  {
    "periodo": "2024-2",
    "docentes": 426,
    "estudiantes": 6852
  },
  {
    "periodo": "2025-1",
    "docentes": 419,
    "estudiantes": 6400
  },
  {
    "periodo": "2025-2",
    "docentes": 381,
    "estudiantes": 6027
  }
];
