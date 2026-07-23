"use client";

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import { SCHOOL_DAYS } from "@/constants/days";

function formatTime(time) {
  if (!time) {
    return "";
  }

  return String(time).slice(0, 5);
}

function cleanFileName(value) {
  return String(value || "horario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getTeacherName(teacher) {
  if (!teacher) {
    return "Sin profesor";
  }

  const name = [teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(" ");

  return name || "Sin profesor";
}

function getGroupShiftId(group) {
  return group.shift_id ?? group.shift?.id ?? null;
}

function getEntryGroupId(entry) {
  return entry.group_id ?? entry.group?.id ?? null;
}

function getSubjectName(entry) {
  return entry.subject?.name || "Materia sin nombre";
}

function sortGroups(firstGroup, secondGroup) {
  const firstGradeOrder =
    firstGroup.grade_level?.order_number ?? Number.MAX_SAFE_INTEGER;

  const secondGradeOrder =
    secondGroup.grade_level?.order_number ?? Number.MAX_SAFE_INTEGER;

  if (firstGradeOrder !== secondGradeOrder) {
    return firstGradeOrder - secondGradeOrder;
  }

  return String(firstGroup.name ?? "").localeCompare(
    String(secondGroup.name ?? ""),
    "es",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function createIndividualEntryKey(dayOfWeek, periodId) {
  return `${dayOfWeek}-${periodId}`;
}

function createGeneralEntryKey(groupId, dayOfWeek, periodId) {
  return `${groupId}-${dayOfWeek}-${periodId}`;
}

function createIndividualEntriesMap(entries) {
  const map = new Map();

  for (const entry of entries) {
    map.set(
      createIndividualEntryKey(entry.day_of_week, entry.shift_period_id),
      entry,
    );
  }

  return map;
}

function createGeneralEntriesMap(entries) {
  const map = new Map();

  for (const entry of entries) {
    const groupId = getEntryGroupId(entry);

    if (!groupId) {
      continue;
    }

    map.set(
      createGeneralEntryKey(groupId, entry.day_of_week, entry.shift_period_id),
      entry,
    );
  }

  return map;
}

function createIndividualCellText({ entry, view }) {
  if (!entry) {
    return "Libre";
  }

  const subjectName = getSubjectName(entry);

  if (view === "teacher") {
    const groupName = entry.group?.name || "Sin grupo";

    return [subjectName, groupName].join("\n");
  }

  const teacherName = getTeacherName(entry.teacher);

  return [subjectName, teacherName].join("\n");
}

function createGeneralCellText({ groups, day, period, entriesMap }) {
  return groups
    .map((group) => {
      const entry = entriesMap.get(
        createGeneralEntryKey(group.id, day.value, period.id),
      );

      if (!entry) {
        return `${group.name} · Libre`;
      }

      const subjectName = getSubjectName(entry);

      const teacherName = getTeacherName(entry.teacher);

      /*
       * Una sola línea por grupo
       * para que entren más grupos
       * dentro del PDF.
       */
      return [group.name, subjectName, teacherName].join(" · ");
    })
    .join("\n");
}

function createIndividualTableBody({ shift, entriesMap, view }) {
  return shift.periods.map((period) => {
    const timeLabel = [
      period.name,
      `${formatTime(period.start_time)}–${formatTime(period.end_time)}`,
    ].join("\n");

    if (period.period_type !== "class") {
      return [
        timeLabel,

        ...SCHOOL_DAYS.map(() =>
          period.period_type === "recess" ? "RECESO" : "NO DISPONIBLE",
        ),
      ];
    }

    return [
      timeLabel,

      ...SCHOOL_DAYS.map((day) => {
        const entry = entriesMap.get(
          createIndividualEntryKey(day.value, period.id),
        );

        return createIndividualCellText({
          entry,
          view,
        });
      }),
    ];
  });
}

function createGeneralTableBody({ shift, groups, entriesMap }) {
  return shift.periods.map((period) => {
    const timeLabel = [
      period.name,
      `${formatTime(period.start_time)}–${formatTime(period.end_time)}`,
    ].join("\n");

    if (period.period_type !== "class") {
      return [
        timeLabel,

        ...SCHOOL_DAYS.map(() =>
          period.period_type === "recess" ? "RECESO" : "NO DISPONIBLE",
        ),
      ];
    }

    return [
      timeLabel,

      ...SCHOOL_DAYS.map((day) =>
        createGeneralCellText({
          groups,
          day,
          period,
          entriesMap,
        }),
      ),
    ];
  });
}

function getPageTitle({ view, selectedEntity, shift }) {
  if (view === "general") {
    return `Vista general · Turno ${shift.name}`;
  }

  if (view === "teacher") {
    return `Horario del profesor: ${selectedEntity?.name || "Sin nombre"}`;
  }

  return `Horario del grupo: ${selectedEntity?.name || "Sin nombre"}`;
}

function addDocumentHeader({
  doc,
  schoolName,
  academicPeriodName,
  versionName,
  view,
  selectedEntity,
  shift,
  generatedAt,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(15, 23, 42);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(view === "general" ? 18 : 17);

  doc.text(schoolName || "Horario escolar", pageWidth / 2, 14, {
    align: "center",
  });

  doc.setFontSize(view === "general" ? 13 : 12);

  doc.text(
    getPageTitle({
      view,
      selectedEntity,
      shift,
    }),
    pageWidth / 2,
    22,
    {
      align: "center",
    },
  );

  doc.setFont("helvetica", "normal");

  doc.setFontSize(9);

  const information = [
    academicPeriodName ? `Ciclo escolar: ${academicPeriodName}` : null,

    versionName ? `Versión: ${versionName}` : null,

    view !== "general"
      ? selectedEntity?.secondaryText || null
      : `Grupos incluidos: ${shift.groupCount ?? 0}`,

    `Exportado: ${generatedAt}`,
  ].filter(Boolean);

  information.forEach((line, index) => {
    doc.text(line, pageWidth / 2, 29 + index * 5, {
      align: "center",
    });
  });

  return 34 + information.length * 5;
}

function addFooter(doc) {
  const pages = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    doc.setPage(pageNumber);

    const pageWidth = doc.internal.pageSize.getWidth();

    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "normal");

    doc.setFontSize(8);

    doc.setTextColor(100, 116, 139);

    doc.text(
      `Página ${pageNumber} de ${pages}`,
      pageWidth - 12,
      pageHeight - 7,
      {
        align: "right",
      },
    );

    doc.text("Generado por Horarium", 12, pageHeight - 7);
  }
}

function applyCellStyles({ data, shift, view }) {
  if (data.section !== "body") {
    return;
  }

  const period = shift.periods[data.row.index];

  if (period?.period_type === "recess") {
    data.cell.styles.fillColor = [254, 243, 199];

    data.cell.styles.textColor = [146, 64, 14];

    data.cell.styles.fontStyle = "bold";

    data.cell.styles.halign = "center";

    data.cell.styles.valign = "middle";

    return;
  }

  if (period?.period_type !== "class") {
    data.cell.styles.fillColor = [226, 232, 240];

    data.cell.styles.textColor = [71, 85, 105];

    data.cell.styles.fontStyle = "bold";

    data.cell.styles.halign = "center";

    data.cell.styles.valign = "middle";

    return;
  }

  if (
    view !== "general" &&
    data.column.index > 0 &&
    data.cell.raw === "Libre"
  ) {
    data.cell.styles.textColor = [148, 163, 184];

    data.cell.styles.fontStyle = "italic";
  }
}

export function generateSchedulePdf({
  schoolName,
  academicPeriodName,
  versionName,
  view,
  selectedEntity,
  shifts = [],
  groups = [],
  entries = [],
}) {
  const isGeneralView = view === "general";

  if (!isGeneralView && !selectedEntity) {
    throw new Error("No se seleccionó un grupo o profesor para exportar.");
  }

  if (!Array.isArray(shifts) || shifts.length === 0) {
    throw new Error("No existen horas configuradas para exportar.");
  }

  if (isGeneralView && (!Array.isArray(groups) || groups.length === 0)) {
    throw new Error("No existen grupos para exportar en la vista general.");
  }

  const doc = new jsPDF({
    orientation: "landscape",

    unit: "mm",

    format: isGeneralView ? "a3" : "a4",
  });

  const generatedAt = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const individualEntriesMap = isGeneralView
    ? null
    : createIndividualEntriesMap(entries);

  const generalEntriesMap = isGeneralView
    ? createGeneralEntriesMap(entries)
    : null;

  let addedShiftCount = 0;

  for (const shift of shifts) {
    const shiftGroups = isGeneralView
      ? [...groups.filter((group) => getGroupShiftId(group) === shift.id)].sort(
          sortGroups,
        )
      : [];

    if (isGeneralView && shiftGroups.length === 0) {
      continue;
    }

    if (addedShiftCount > 0) {
      doc.addPage();
    }

    addedShiftCount += 1;

    const shiftWithCount = {
      ...shift,
      groupCount: shiftGroups.length,
    };

    const cursorY = addDocumentHeader({
      doc,
      schoolName,
      academicPeriodName,
      versionName,
      view,
      selectedEntity,
      shift: shiftWithCount,
      generatedAt,
    });

    doc.setFont("helvetica", "bold");

    doc.setFontSize(10);

    doc.setTextColor(15, 23, 42);

    doc.text(
      `${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`,
      12,
      cursorY,
    );

    const tableBody = isGeneralView
      ? createGeneralTableBody({
          shift,
          groups: shiftGroups,
          entriesMap: generalEntriesMap,
        })
      : createIndividualTableBody({
          shift,
          entriesMap: individualEntriesMap,
          view,
        });

    autoTable(doc, {
      startY: cursorY + 5,

      head: [["Hora", ...SCHOOL_DAYS.map((day) => day.name)]],

      body: tableBody,

      theme: "grid",

      styles: {
        font: "helvetica",

        fontSize: isGeneralView ? 5.2 : 7.5,

        cellPadding: isGeneralView ? 1.5 : 2.5,

        valign: isGeneralView ? "top" : "middle",

        halign: isGeneralView ? "left" : "center",

        overflow: "linebreak",

        lineColor: [203, 213, 225],

        lineWidth: 0.2,

        minCellHeight: isGeneralView ? 20 : 17,
      },

      headStyles: {
        fillColor: [15, 23, 42],

        textColor: [255, 255, 255],

        fontStyle: "bold",

        fontSize: isGeneralView ? 7 : 8,

        halign: "center",

        valign: "middle",
      },

      columnStyles: {
        0: {
          cellWidth: isGeneralView ? 29 : 35,

          fontStyle: "bold",

          fillColor: [248, 250, 252],

          halign: "center",

          valign: "middle",
        },
      },

      didParseCell(data) {
        applyCellStyles({
          data,
          shift,
          view,
        });
      },

      margin: {
        top: 12,
        right: 10,
        bottom: 15,
        left: 10,
      },

      pageBreak: "auto",

      rowPageBreak: "avoid",
    });
  }

  if (addedShiftCount === 0) {
    throw new Error("No existen turnos con grupos para exportar.");
  }

  addFooter(doc);

  if (isGeneralView) {
    doc.save(`horario-general-${cleanFileName(schoolName)}.pdf`);

    return;
  }

  const entityFileName = cleanFileName(selectedEntity.name);

  const viewFileName = view === "teacher" ? "profesor" : "grupo";

  doc.save(`horario-${viewFileName}-${entityFileName}.pdf`);
}
