import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

const ACCENT_COLOR = "1F4E79"; // professional navy blue
const TEXT_COLOR = "1A1A1A";

function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    border: {
      bottom: {
        color: ACCENT_COLOR,
        space: 2,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        color: ACCENT_COLOR,
        size: 24,
      }),
    ],
  });
}

function bulletParagraph(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, color: TEXT_COLOR, size: 22 })],
  });
}

function dateRange(start, end) {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

/**
 * Builds a .docx Buffer from the structured resume object produced by tailorResume().
 */
export async function generateResumeDocx(resume) {
  const children = [];

  // --- Header: name, title, contact line ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: resume.contact?.name || "Your Name",
          bold: true,
          size: 36,
          color: ACCENT_COLOR,
        }),
      ],
    })
  );

  if (resume.contact?.title) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new TextRun({ text: resume.contact.title, size: 24, italics: true, color: TEXT_COLOR }),
        ],
      })
    );
  }

  const contactLine = [
    resume.contact?.location,
    resume.contact?.email,
    resume.contact?.phone,
    ...(resume.contact?.links || []),
  ]
    .filter(Boolean)
    .join("   |   ");

  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contactLine, size: 20, color: TEXT_COLOR })],
      })
    );
  }

  // --- Summary ---
  if (resume.summary) {
    children.push(sectionHeading("Professional Summary"));
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: resume.summary, size: 22, color: TEXT_COLOR })],
      })
    );
  }

  // --- Skills ---
  if (resume.skills?.length) {
    children.push(sectionHeading("Skills"));
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: resume.skills.join("  •  "), size: 22, color: TEXT_COLOR })],
      })
    );
  }

  // --- Experience ---
  if (resume.experience?.length) {
    children.push(sectionHeading("Experience"));
    for (const job of resume.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: job.role || "", bold: true, size: 23, color: TEXT_COLOR }),
            new TextRun({ text: job.company ? `  —  ${job.company}` : "", bold: true, size: 23, color: TEXT_COLOR }),
          ],
        })
      );
      const meta = [job.location, dateRange(job.startDate, job.endDate)]
        .filter(Boolean)
        .join("   |   ");
      if (meta) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: meta, italics: true, size: 20, color: TEXT_COLOR })],
          })
        );
      }
      for (const bullet of job.bullets || []) {
        children.push(bulletParagraph(bullet));
      }
    }
  }

  // --- Education ---
  if (resume.education?.length) {
    children.push(sectionHeading("Education"));
    for (const edu of resume.education) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [
            new TextRun({ text: edu.degree || "", bold: true, size: 22, color: TEXT_COLOR }),
            new TextRun({ text: edu.institution ? `  —  ${edu.institution}` : "", bold: true, size: 22, color: TEXT_COLOR }),
          ],
        })
      );
      const meta = [edu.location, dateRange(edu.startDate, edu.endDate)]
        .filter(Boolean)
        .join("   |   ");
      if (meta) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: meta, italics: true, size: 20, color: TEXT_COLOR })],
          })
        );
      }
    }
  }

  // --- Certifications ---
  if (resume.certifications?.length) {
    children.push(sectionHeading("Certifications"));
    for (const cert of resume.certifications) {
      children.push(bulletParagraph(cert));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
