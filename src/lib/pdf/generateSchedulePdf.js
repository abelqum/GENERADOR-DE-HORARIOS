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
    return "";
  }

  const name = [teacher.first_name, teacher.last_name]
    .filter(Boolean)
    .join(" ");

  return name || "";
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

function isWorkshopEntry(entry) {
  return (
    entry?.activity_type === "workshop" ||
    entry?.is_fixed_activity === true ||
    String(entry?.subject?.name || "")
      .trim()
      .toLowerCase() === "taller"
  );
}

function isServiceEntry(entry) {
  return (
    entry?.activity_type === "service" ||
    entry?.is_teacher_slot_label === true ||
    String(entry?.label || "")
      .trim()
      .toLowerCase() === "servicio" ||
    String(entry?.subject?.name || "")
      .trim()
      .toLowerCase() === "servicio"
  );
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

  if (isServiceEntry(entry)) {
    return "Servicio";
  }

  if (isWorkshopEntry(entry)) {
    return "Taller";
  }

  const subjectName = getSubjectName(entry);

  if (view === "teacher") {
    const groupName = entry.group?.name || "Sin grupo";

    return [subjectName, groupName].join("\n");
  }

  const teacherName = getTeacherName(entry.teacher);

  return [subjectName, teacherName].filter(Boolean).join("\n");
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

      if (isWorkshopEntry(entry)) {
        return `${group.name} · ` + "Taller";
      }

      const subjectName = getSubjectName(entry);

      const teacherName = getTeacherName(entry.teacher);

      return [group.name, subjectName, teacherName].filter(Boolean).join(" · ");
    })
    .join("\n");
}

function flattenIndividualPeriods(shifts) {
  const showShiftName = shifts.length > 1;

  return shifts.flatMap((shift) =>
    shift.periods.map((period) => ({
      ...period,

      pdfShiftName: showShiftName ? shift.name : null,
    })),
  );
}

function createTimeLabel(period) {
  const parts = [];

  if (period.pdfShiftName) {
    parts.push(`Turno ${period.pdfShiftName}`);
  }

  parts.push(period.name);

  parts.push(`${formatTime(period.start_time)}–${formatTime(period.end_time)}`);

  return parts.filter(Boolean).join("\n");
}

function createIndividualTableBody({ periods, entriesMap, view }) {
  return periods.map((period) => {
    const timeLabel = createTimeLabel(period);

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

function addIndividualHeader({
  doc,
  schoolName,
  academicPeriodName,
  view,
  selectedEntity,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(15, 23, 42);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(15);

  doc.text(`Escuela: ${schoolName || "Sin nombre"}`, pageWidth / 2, 11, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");

  doc.setFontSize(9);

  doc.text(
    `Ciclo escolar: ${academicPeriodName || "Sin especificar"}`,
    pageWidth / 2,
    17,
    {
      align: "center",
    },
  );

  doc.setFont("helvetica", "bold");

  doc.setFontSize(11);

  doc.text(
    `${view === "teacher" ? "Profesor(a)" : "Grupo"}: ${
      selectedEntity?.name || "Sin nombre"
    }`,
    pageWidth / 2,
    24,
    {
      align: "center",
    },
  );

  return 28;
}

function addGeneralHeader({ doc, schoolName, academicPeriodName, shift }) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(15, 23, 42);

  doc.setFont("helvetica", "bold");

  doc.setFontSize(18);

  doc.text(schoolName || "Horario escolar", pageWidth / 2, 14, {
    align: "center",
  });

  doc.setFontSize(13);

  doc.text(`Vista general · Turno ${shift.name}`, pageWidth / 2, 22, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");

  doc.setFontSize(9);

  doc.text(
    `Ciclo escolar: ${academicPeriodName || "Sin especificar"}`,
    pageWidth / 2,
    29,
    {
      align: "center",
    },
  );

  doc.text(`Grupos incluidos: ${shift.groupCount ?? 0}`, pageWidth / 2, 34, {
    align: "center",
  });

  return 39;
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

function addTeacherSignatures({ doc, directorName, teacherName }) {
  const pageWidth = doc.internal.pageSize.getWidth();

  const pageHeight = doc.internal.pageSize.getHeight();

  const leftCenter = pageWidth * 0.25;

  const rightCenter = pageWidth * 0.75;

  const lineHalfWidth = 48;

  const lineY = pageHeight - 21;

  const textY = lineY + 5.5;

  doc.setDrawColor(51, 65, 85);

  doc.setLineWidth(0.35);

  /*
   * Firma de la directora.
   */
  doc.line(
    leftCenter - lineHalfWidth,
    lineY,
    leftCenter + lineHalfWidth,
    lineY,
  );

  /*
   * Firma de recibido del profesor.
   */
  doc.line(
    rightCenter - lineHalfWidth,
    lineY,
    rightCenter + lineHalfWidth,
    lineY,
  );

  doc.setTextColor(15, 23, 42);

  doc.setFont("helvetica", "normal");

  doc.setFontSize(8.5);

  const directorText = doc.splitTextToSize(
    `Directora: ${directorName || "Sin nombre"}`,
    96,
  );

  const receivedText = doc.splitTextToSize(
    `Recibo horario: ${teacherName || "Sin nombre"}`,
    96,
  );

  doc.text(directorText, leftCenter, textY, {
    align: "center",
  });

  doc.text(receivedText, rightCenter, textY, {
    align: "center",
  });
}

function cellContainsWorkshop(rawValue) {
  return String(rawValue || "")
    .toLowerCase()
    .includes("taller");
}

function cellContainsService(rawValue) {
  return (
    String(rawValue || "")
      .trim()
      .toLowerCase() === "servicio"
  );
}

function applyCellStyles({ data, periods, view }) {
  if (data.section !== "body") {
    return;
  }

  const period = periods[data.row.index];

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

  if (data.column.index > 0 && cellContainsWorkshop(data.cell.raw)) {
    data.cell.styles.fillColor = [255, 247, 237];

    data.cell.styles.textColor = [154, 52, 18];

    data.cell.styles.fontStyle = "bold";

    data.cell.styles.halign = "center";

    data.cell.styles.valign = "middle";

    return;
  }

  if (data.column.index > 0 && cellContainsService(data.cell.raw)) {
    data.cell.styles.fillColor = [239, 246, 255];

    data.cell.styles.textColor = [29, 78, 216];

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

function getIndividualTableSizing({
  doc,
  startY,
  rowCount,
  reservedBottomSpace = 8,
}) {
  const pageHeight = doc.internal.pageSize.getHeight();

  const availableHeight = pageHeight - startY - reservedBottomSpace;

  const estimatedHeadHeight = 8;

  const usableRowsHeight = Math.max(58, availableHeight - estimatedHeadHeight);

  const calculatedRowHeight = usableRowsHeight / Math.max(rowCount, 1);

  const rowHeight = Math.max(6, Math.min(13, calculatedRowHeight));

  if (rowCount <= 9) {
    return {
      fontSize: 7,

      headFontSize: 8,

      cellPadding: 1.5,

      minCellHeight: Math.min(12.5, rowHeight),

      timeColumnWidth: 31,
    };
  }

  if (rowCount <= 14) {
    return {
      fontSize: 6.1,

      headFontSize: 7.2,

      cellPadding: 1,

      minCellHeight: rowHeight,

      timeColumnWidth: 30,
    };
  }

  return {
    fontSize: 5.2,

    headFontSize: 6.5,

    cellPadding: 0.6,

    minCellHeight: rowHeight,

    timeColumnWidth: 29,
  };
}

function renderIndividualSchedule({
  doc,
  schoolName,
  academicPeriodName,
  view,
  selectedEntity,
  shifts,
  entriesMap,
  directorName,
}) {
  const periods = flattenIndividualPeriods(shifts);

  if (periods.length === 0) {
    throw new Error("No existen horas configuradas para este horario.");
  }

  const startY = addIndividualHeader({
    doc,
    schoolName,
    academicPeriodName,
    view,
    selectedEntity,
  });

  /*
   * En profesores se reservan 38 mm
   * para las firmas.
   */
  const reservedBottomSpace = view === "teacher" ? 38 : 8;

  const sizing = getIndividualTableSizing({
    doc,
    startY,
    rowCount: periods.length,
    reservedBottomSpace,
  });

  const tableBody = createIndividualTableBody({
    periods,
    entriesMap,
    view,
  });

  autoTable(doc, {
    startY,

    head: [["Hora", ...SCHOOL_DAYS.map((day) => day.name)]],

    body: tableBody,

    theme: "grid",

    styles: {
      font: "helvetica",

      fontSize: sizing.fontSize,

      cellPadding: sizing.cellPadding,

      valign: "middle",

      halign: "center",

      overflow: "linebreak",

      lineColor: [203, 213, 225],

      lineWidth: 0.2,

      minCellHeight: sizing.minCellHeight,

      cellWidth: "wrap",
    },

    headStyles: {
      fillColor: [15, 23, 42],

      textColor: [255, 255, 255],

      fontStyle: "bold",

      fontSize: sizing.headFontSize,

      halign: "center",

      valign: "middle",

      cellPadding: 1.2,
    },

    columnStyles: {
      0: {
        cellWidth: sizing.timeColumnWidth,

        fontStyle: "bold",

        fillColor: [248, 250, 252],

        halign: "center",

        valign: "middle",
      },
    },

    didParseCell(data) {
      applyCellStyles({
        data,
        periods,
        view,
      });
    },

    margin: {
      top: 6,

      right: 7,

      bottom: view === "teacher" ? 36 : 6,

      left: 7,
    },

    pageBreak: "avoid",

    rowPageBreak: "avoid",

    showHead: "firstPage",
  });

  if (doc.getNumberOfPages() > 1) {
    throw new Error(
      "El horario contiene demasiadas filas para caber legiblemente en una sola hoja A4.",
    );
  }

  if (view === "teacher") {
    const pageHeight = doc.internal.pageSize.getHeight();

    const signatureLineY = pageHeight - 21;

    const tableFinalY = doc.lastAutoTable?.finalY ?? startY;

    if (tableFinalY > signatureLineY - 6) {
      throw new Error(
        "El horario no deja espacio suficiente para colocar las firmas en la misma página.",
      );
    }

    addTeacherSignatures({
      doc,

      directorName,

      teacherName: selectedEntity?.name || "",
    });
  }
}

function renderGeneralSchedule({
  doc,
  schoolName,
  academicPeriodName,
  shifts,
  groups,
  entriesMap,
}) {
  let addedShiftCount = 0;

  for (const shift of shifts) {
    const shiftGroups = [
      ...groups.filter((group) => getGroupShiftId(group) === shift.id),
    ].sort(sortGroups);

    if (shiftGroups.length === 0) {
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

    const cursorY = addGeneralHeader({
      doc,
      schoolName,
      academicPeriodName,
      shift: shiftWithCount,
    });

    const tableBody = createGeneralTableBody({
      shift,
      groups: shiftGroups,
      entriesMap,
    });

    autoTable(doc, {
      startY: cursorY,

      head: [["Hora", ...SCHOOL_DAYS.map((day) => day.name)]],

      body: tableBody,

      theme: "grid",

      styles: {
        font: "helvetica",

        fontSize: 5.2,

        cellPadding: 1.5,

        valign: "top",

        halign: "left",

        overflow: "linebreak",

        lineColor: [203, 213, 225],

        lineWidth: 0.2,

        minCellHeight: 20,
      },

      headStyles: {
        fillColor: [15, 23, 42],

        textColor: [255, 255, 255],

        fontStyle: "bold",

        fontSize: 7,

        halign: "center",

        valign: "middle",
      },

      columnStyles: {
        0: {
          cellWidth: 29,

          fontStyle: "bold",

          fillColor: [248, 250, 252],

          halign: "center",

          valign: "middle",
        },
      },

      didParseCell(data) {
        applyCellStyles({
          data,

          periods: shift.periods,

          view: "general",
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
  directorName = "",
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

  if (view === "teacher" && !String(directorName).trim()) {
    throw new Error(
      "No se encontró el nombre de la directora para colocar la firma.",
    );
  }

  const doc = new jsPDF({
    orientation: "landscape",

    unit: "mm",

    format: isGeneralView ? "a3" : "a4",
  });

  if (isGeneralView) {
    renderGeneralSchedule({
      doc,

      schoolName,

      academicPeriodName,

      shifts,

      groups,

      entriesMap: createGeneralEntriesMap(entries),
    });

    addFooter(doc);

    doc.save(`horario-general-${cleanFileName(schoolName)}.pdf`);

    return;
  }

  renderIndividualSchedule({
    doc,

    schoolName,

    academicPeriodName,

    view,

    selectedEntity,

    shifts,

    entriesMap: createIndividualEntriesMap(entries),

    directorName,
  });

  const entityFileName = cleanFileName(selectedEntity.name);

  const viewFileName = view === "teacher" ? "profesor" : "grupo";

  doc.save(`horario-${viewFileName}-${entityFileName}.pdf`);
}
