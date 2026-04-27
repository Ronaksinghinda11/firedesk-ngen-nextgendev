/**
 * Service Form PDF Generation Service
 * Uses puppeteer (with bundled Chromium) to render HTML template to PDF
 */
const puppeteer = require('puppeteer');

/**
 * Generate HTML for the service form PDF
 * @param {Object} form - The service form data
 * @param {string} frequency - The frequency filter (DAILY, WEEKLY, MONTHLY, etc.)
 * @param {Array} filteredSections - Sections with questions filtered by frequency
 */
const generateFormHTML = (form, frequency, filteredSections) => {
  const frequencyLabels = {
    'DAILY': 'Daily',
    'WEEKLY': 'Weekly',
    'MONTHLY': 'Monthly',
    'QUARTERLY': 'Quarterly',
    'HALF_YEARLY': 'Half-Yearly',
    'YEARLY': 'Yearly'
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Generate checklist sections HTML
  let checklistHTML = '';

  filteredSections.forEach((section, sectionIdx) => {
    if (!section.questions || section.questions.length === 0) return;

    // Section header
    checklistHTML += `
      <div class="section-header">${section.sectionName}</div>
      <div class="checklist-container">
    `;

    // Split questions into two columns
    const questions = section.questions;
    const midPoint = Math.ceil(questions.length / 2);
    const leftColumn = questions.slice(0, midPoint);
    const rightColumn = questions.slice(midPoint);

    // Left column
    checklistHTML += '<div class="checklist-column">';
    leftColumn.forEach((q, idx) => {
      const questionNum = idx * 2 + 1;
      checklistHTML += `
        <div class="check-item">
          <div class="check-question">${questionNum}. ${escapeHtml(q.questionText)}</div>
          <div class="check-status-placeholder">
            <span class="checkbox-empty"></span>
            <span class="status-label">Compliant</span>
            <span class="checkbox-empty"></span>
            <span class="status-label">Non-Compliant</span>
          </div>
        </div>
      `;
    });
    checklistHTML += '</div>';

    // Right column
    checklistHTML += '<div class="checklist-column">';
    rightColumn.forEach((q, idx) => {
      const questionNum = idx * 2 + 2;
      checklistHTML += `
        <div class="check-item">
          <div class="check-question">${questionNum}. ${escapeHtml(q.questionText)}</div>
          <div class="check-status-placeholder">
            <span class="checkbox-empty"></span>
            <span class="status-label">Compliant</span>
            <span class="checkbox-empty"></span>
            <span class="status-label">Non-Compliant</span>
          </div>
        </div>
      `;
    });
    checklistHTML += '</div>';

    checklistHTML += '</div>'; // Close checklist-container
  });

  // Calculate total questions
  const totalQuestions = filteredSections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(form.serviceName)} - ${frequencyLabels[frequency] || frequency} Checklist</title>
    <style>
        :root {
            --border-color: #333;
            --header-bg: #e0e0e0;
            --primary-font: "Helvetica Neue", Helvetica, Arial, sans-serif;
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            font-family: var(--primary-font);
            margin: 0;
            padding: 20px;
            background-color: white;
        }

        .page-container {
            width: 210mm;
            min-height: 297mm;
            background-color: white;
            padding: 15mm;
            margin: 0 auto;
        }

        /* Header Section */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
            margin-bottom: 20px;
        }

        .company-logo {
            font-size: 24px;
            font-weight: bold;
            color: #FC8A17;
            text-transform: uppercase;
        }
        
        .company-sub {
            color: #333;
            font-size: 18px;
        }

        .form-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            flex-grow: 1;
        }

        /* Grid Layouts */
        .info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0;
            border: 1px solid var(--border-color);
            margin-bottom: 20px;
        }

        .info-cell {
            padding: 8px;
            border-right: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            font-size: 12px;
        }

        .info-cell:nth-child(4n) {
            border-right: none;
        }

        .label {
            display: block;
            font-weight: bold;
            color: #555;
            margin-bottom: 4px;
            font-size: 10px;
            text-transform: uppercase;
        }

        .value {
            display: block;
            font-weight: 600;
            font-size: 13px;
            color: #000;
        }

        .value-placeholder {
            display: block;
            min-height: 18px;
            border-bottom: 1px dotted #999;
        }

        /* Section Headers */
        .section-header {
            background-color: var(--header-bg);
            padding: 8px;
            font-weight: bold;
            border: 1px solid var(--border-color);
            border-bottom: none;
            text-transform: uppercase;
            font-size: 14px;
            margin-top: 15px;
        }

        /* Checklist Section */
        .checklist-container {
            display: flex;
            gap: 15px;
            margin-top: 0;
            border: 1px solid var(--border-color);
            border-top: none;
            padding: 10px;
        }

        .checklist-column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .check-item {
            padding: 10px;
            border: 1px solid #bbb;
            border-radius: 6px;
            background-color: white;
            break-inside: avoid;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 70px;
        }

        .check-question {
            margin-bottom: 8px;
            font-weight: 500;
            font-size: 12px;
            line-height: 1.4;
        }

        .check-status-placeholder {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
        }

        .checkbox-empty {
            width: 14px;
            height: 14px;
            border: 1.5px solid #333;
            border-radius: 2px;
            display: inline-block;
        }

        .status-label {
            margin-right: 15px;
            color: #555;
        }

        /* Completion Section */
        .completion-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid var(--border-color);
            border-top: none;
        }

        .remarks-box {
            min-height: 60px;
        }

        /* Image Placeholder */
        .image-section {
            margin-top: 10px;
            border: 1px solid var(--border-color);
            padding: 15px;
            min-height: 100px;
            background-color: #f9f9f9;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
        }

        .image-card {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .image-placeholder-inner {
            width: 100%;
            aspect-ratio: 4/3;
            background-color: #eee;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 11px;
            border-radius: 2px;
            margin-bottom: 5px;
        }

        .image-caption {
            font-size: 10px;
            color: #555;
            font-weight: 500;
        }

        /* Footer */
        .footer-info {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 10px;
            color: #666;
            text-align: center;
        }

        @media print {
            body {
                background-color: white;
                padding: 0;
            }
            .page-container {
                width: 100%;
                padding: 10mm;
                margin: 0;
            }
            .check-item {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        
        <!-- Header -->
        <div class="header">
            <div>
                <div class="company-logo">FireDesk</div>
                <div class="company-sub">Leistung Technologies</div>
            </div>
            <div class="form-title">${escapeHtml(form.serviceName)}<br/><span style="font-size: 14px; font-weight: normal;">${frequencyLabels[frequency] || frequency} ${formatServiceType(form.serviceType)}</span></div>
        </div>

        <!-- General Info Grid -->
        <div class="info-grid">
            <div class="info-cell">
                <span class="label">Asset ID</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell">
                <span class="label">Serial No.</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell">
                <span class="label">Type</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell">
                <span class="label">Report No</span>
                <span class="value-placeholder"></span>
            </div>

            <div class="info-cell">
                <span class="label">Location</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell">
                <span class="label">Frequency</span>
                <span class="value">${frequencyLabels[frequency] || frequency}</span>
            </div>
            <div class="info-cell">
                <span class="label">Form Code</span>
                <span class="value">${escapeHtml(form.formCode || 'N/A')}</span>
            </div>
            <div class="info-cell">
                <span class="label">Date</span>
                <span class="value-placeholder"></span>
            </div>

            <div class="info-cell">
                <span class="label">Condition</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell">
                <span class="label">Status</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell" style="border-right:none; grid-column: span 2;">
                <span class="label">Total Questions</span>
                <span class="value">${totalQuestions}</span>
            </div>
        </div>

        <!-- Checklist Sections -->
        ${checklistHTML}

        <!-- Completion Section -->
        <div class="section-header" style="margin-top: 20px;">Completion Details</div>
        <div class="info-grid" style="border-top: none; grid-template-columns: 1fr 1fr;">
            
            <div class="info-cell remarks-box">
                <span class="label">Technician Remarks</span>
                <span class="value-placeholder" style="min-height: 40px;"></span>
            </div>
            <div class="info-cell remarks-box" style="border-right: none;">
                <span class="label">Manager Remarks</span>
                <span class="value-placeholder" style="min-height: 40px;"></span>
            </div>

            <div class="info-cell">
                <span class="label">Technician Name</span>
                <span class="value-placeholder"></span>
            </div>
            <div class="info-cell" style="border-right: none;">
                <span class="label">Signature</span>
                <span class="value-placeholder"></span>
            </div>
        </div>

        <!-- Image Placeholder -->
        <div class="section-header" style="margin-top: 10px;">Images</div>
        <div class="image-section">
            <div class="image-card">
                <div class="image-placeholder-inner">[Image 1]</div>
                <span class="image-caption">Caption</span>
            </div>
            <div class="image-card">
                <div class="image-placeholder-inner">[Image 2]</div>
                <span class="image-caption">Caption</span>
            </div>
            <div class="image-card">
                <div class="image-placeholder-inner">[Image 3]</div>
                <span class="image-caption">Caption</span>
            </div>
            <div class="image-card">
                <div class="image-placeholder-inner">[Image 4]</div>
                <span class="image-caption">Caption</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer-info">
            Generated on ${currentDate} | Form: ${escapeHtml(form.serviceName)} | Frequency: ${frequencyLabels[frequency] || frequency}
        </div>

    </div>
</body>
</html>
  `;
};

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Generate PDF buffer from service form data
 * @param {Object} form - The service form with sections and questions
 * @param {string} frequency - The frequency to filter by (DAILY, WEEKLY, MONTHLY, etc.)
 * @returns {Promise<Buffer>} - PDF buffer
 */
/**
 * Generate PDF buffer from service form data
 * @param {Object} form - The service form with sections and questions
 * @param {string} frequency - The frequency to filter by (DAILY, WEEKLY, MONTHLY, etc.)
 * @returns {Promise<Buffer>} - PDF buffer
 */
const formatServiceType = (type) => {
  if (!type) return 'Inspection'; // Default
  // Convert INSPECTION -> Inspection, TESTING -> Testing, etc.
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const generateServiceFormPDF = async (form, frequency) => {
  // Filter sections and questions by frequency
  const filteredSections = (form.sections || [])
    .map(section => ({
      ...section,
      questions: (section.questions || []).filter(q =>
        q.applicableFrequencies && q.applicableFrequencies.includes(frequency)
      ).sort((a, b) => a.questionOrder - b.questionOrder)
    }))
    .filter(section => section.questions && section.questions.length > 0)
    .sort((a, b) => a.sectionOrder - b.sectionOrder);

  if (filteredSections.length === 0) {
    throw new Error(`No questions found for frequency: ${frequency}`);
  }

  // Generate HTML
  const html = generateFormHTML(form, frequency, filteredSections);

  console.log(`[PDF Service] Generating PDF for form: ${form.serviceName}, Frequency: ${frequency}`);

  // Use shared PDF generator
  const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');

  return await htmlToPdfBuffer(html, {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  });
};

/**
 * Generate HTML for submission PDF with answers
 */
const generateSubmissionHTML = (serviceData, formData, sections) => {
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const submittedDate = serviceData.submittedAt
    ? new Date(serviceData.submittedAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : 'N/A';

  // Build sections HTML
  let sectionsHTML = '';
  let questionNumber = 1;

  sections.forEach((section) => {
    if (!section.questions || section.questions.length === 0) return;

    sectionsHTML += `
      <div class="section">
        <div class="section-header">${escapeHtml(section.sectionName)}</div>
        <table class="questions-table">
          <thead>
            <tr>
              <th style="width: 5%">SL</th>
              <th style="width: 30%">Question</th>
              <th style="width: 15%">Answer</th>
              <th style="width: 30%">Notes/Comments</th>
              <th style="width: 20%">Photo</th>
            </tr>
          </thead>
          <tbody>
    `;

    section.questions.forEach((question) => {
      const answer = question.answer;
      let answerValue = answer?.answerValue || '-';
      const notes = answer?.notes || '-';
      const photoBase64 = answer?.photoBase64 || null;

      // Convert boolean string values to Satisfactory/Unsatisfactory for BOOLEAN type questions
      if (question.answerType === 'BOOLEAN' || answerValue === 'true' || answerValue === 'false') {
        if (answerValue === 'true' || answerValue === true) {
          answerValue = 'Satisfactory';
        } else if (answerValue === 'false' || answerValue === false) {
          answerValue = 'Unsatisfactory';
        }
      }

      // Determine answer styling based on value
      let answerClass = '';
      if (answerValue === 'YES' || answerValue === 'COMPLIANT' || answerValue === 'OK' || answerValue === 'Satisfactory') {
        answerClass = 'answer-compliant';
      } else if (answerValue === 'NO' || answerValue === 'NON-COMPLIANT' || answerValue === 'NOT OK' || answerValue === 'Unsatisfactory') {
        answerClass = 'answer-non-compliant';
      } else if (answerValue === 'N/A' || answerValue === 'NA') {
        answerClass = 'answer-na';
      }

      // Build photo HTML
      const photoHTML = photoBase64
        ? `<img src="${photoBase64}" style="max-width: 80px; max-height: 60px; border-radius: 4px; object-fit: cover;" alt="Photo evidence" />`
        : '<span style="color: #94a3b8; font-size: 8pt;">No photo</span>';

      sectionsHTML += `
        <tr>
          <td class="sl-col">${questionNumber}</td>
          <td class="question-col">${escapeHtml(question.questionText)}</td>
          <td class="answer-col ${answerClass}">${escapeHtml(answerValue)}</td>
          <td class="notes-col">${escapeHtml(notes)}</td>
          <td class="photo-col">${photoHTML}</td>
        </tr>
      `;
      questionNumber++;
    });

    sectionsHTML += `
          </tbody>
        </table>
      </div>
    `;
  });

  // Build geo location footer
  const geoLocation = serviceData.asset?.lat && serviceData.asset?.long
    ? `Lat: ${serviceData.asset.lat}, Long: ${serviceData.asset.long}`
    : 'Not available';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 10pt;
          color: #333;
          background: #fff;
          line-height: 1.4;
        }
        .container {
          padding: 15px;
          max-width: 100%;
        }
        
        /* Header Section */
        .header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .header-title {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .header-subtitle {
          font-size: 10pt;
          opacity: 0.9;
        }
        
        /* Service Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
        }
        .info-label {
          font-size: 8pt;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .info-value {
          font-size: 10pt;
          font-weight: 600;
          color: #1e293b;
        }
        
        /* Technician & Timeline */
        .meta-section {
          background: #f1f5f9;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 20px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .meta-icon {
          width: 24px;
          height: 24px;
          background: #3b82f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
        }
        .meta-text {
          font-size: 9pt;
        }
        .meta-label {
          color: #64748b;
          font-size: 8pt;
        }
        
        /* Sections & Questions */
        .section {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .section-header {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 11pt;
          border-radius: 6px 6px 0 0;
        }
        .questions-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
        }
        .questions-table th {
          background: #f8fafc;
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 9pt;
          border-bottom: 2px solid #e2e8f0;
          color: #475569;
        }
        .questions-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        .sl-col {
          text-align: center;
          font-weight: 600;
          color: #64748b;
        }
        .question-col {
          font-size: 9pt;
        }
        .answer-col {
          font-weight: 600;
          text-align: center;
        }
        .answer-compliant {
          color: #16a34a;
          background: #f0fdf4;
        }
        .answer-non-compliant {
          color: #dc2626;
          background: #fef2f2;
        }
        .answer-na {
          color: #6b7280;
          background: #f9fafb;
        }
        .notes-col {
          font-size: 9pt;
          color: #475569;
        }
        .photo-col {
          text-align: center;
          vertical-align: middle;
        }
        
        /* Footer */
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #e2e8f0;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .signature-box {
          border: 1px dashed #cbd5e1;
          padding: 15px;
          border-radius: 6px;
          min-height: 80px;
        }
        .signature-label {
          font-size: 9pt;
          color: #64748b;
          margin-bottom: 40px;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 30px;
          padding-top: 5px;
          font-size: 8pt;
          color: #64748b;
        }
        .geo-info {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          padding: 10px 15px;
          margin-top: 15px;
          font-size: 9pt;
        }
        .geo-label {
          font-weight: 600;
          color: #92400e;
        }
        .geo-value {
          color: #78350f;
        }
        
        /* Status badges */
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 9pt;
          font-weight: 600;
        }
        .status-completed {
          background: #dcfce7;
          color: #166534;
        }
        .status-approved {
          background: #dbeafe;
          color: #1e40af;
        }
        
        /* Manager remarks */
        .remarks-section {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 20px;
        }
        .remarks-title {
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 8px;
        }
        .remarks-text {
          color: #1e3a5f;
        }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-title">${escapeHtml(formData.serviceName || 'Service Form')}</div>
          <div class="header-subtitle">
            Submission #${escapeHtml(serviceData.submissionNumber || 'N/A')} | 
            ${escapeHtml(serviceData.frequency?.frequencyName || 'N/A')} ${formatServiceType(formData.serviceType)}
            <span class="status-badge status-${(serviceData.status || '').toLowerCase()}" style="margin-left: 10px;">
              ${escapeHtml(serviceData.status || 'N/A')}
            </span>
          </div>
        </div>

        <!-- Service Info -->
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Asset ID</div>
            <div class="info-value">${escapeHtml(serviceData.asset?.assetId || 'N/A')}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Location</div>
            <div class="info-value">${escapeHtml(serviceData.asset?.location || 'N/A')}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Building</div>
            <div class="info-value">${escapeHtml(serviceData.asset?.building || 'N/A')}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Scheduled Date</div>
            <div class="info-value">${serviceData.scheduledDate ? new Date(serviceData.scheduledDate).toLocaleDateString('en-GB') : 'N/A'}</div>
          </div>
        </div>

        <!-- Technician & Timeline -->
        <div class="meta-section">
          <div class="meta-item">
            <div class="meta-icon">👤</div>
            <div>
              <div class="meta-label">Performed By</div>
              <div class="meta-text">${escapeHtml(serviceData.submittedBy?.user?.name || serviceData.technician?.user?.name || 'N/A')}</div>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-icon">📅</div>
            <div>
              <div class="meta-label">Submitted On</div>
              <div class="meta-text">${submittedDate}</div>
            </div>
          </div>
          <div class="meta-item">
            <div class="meta-icon">✓</div>
            <div>
              <div class="meta-label">Reviewed On</div>
              <div class="meta-text">${serviceData.approvedAt ? new Date(serviceData.approvedAt).toLocaleDateString('en-GB') : 'Pending'}</div>
            </div>
          </div>
        </div>

        ${serviceData.approvalRemarks ? `
        <!-- Manager Remarks -->
        <div class="remarks-section">
          <div class="remarks-title">Manager Remarks</div>
          <div class="remarks-text">${escapeHtml(serviceData.approvalRemarks)}</div>
        </div>
        ` : ''}

        <!-- Form Sections with Answers -->
        ${sectionsHTML}

        <!-- Footer -->
        <div class="footer">
          <div class="geo-info">
            <span class="geo-label">📍 Geo Location:</span>
            <span class="geo-value">${escapeHtml(geoLocation)}</span>
          </div>
          
          <div class="footer-grid" style="margin-top: 20px;">
            <div class="signature-box">
              <div class="signature-label">Technician Signature</div>
              <div class="signature-line">Name: ${escapeHtml(serviceData.submittedBy?.user?.name || serviceData.technician?.user?.name || '________________')}</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Manager/Supervisor Signature</div>
              <div class="signature-line">Name: ________________</div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 15px; font-size: 8pt; color: #94a3b8;">
            Generated on ${currentDate} | Firedesk Service Management System
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate PDF for a submitted service form with answers
 * @param {Object} serviceData - The service submission data
 * @param {Object} formData - The form structure
 * @param {Array} sections - Sections with questions and answers
 * @returns {Promise<Buffer>} - PDF buffer
 */
const generateSubmissionPDF = async (serviceData, formData, sections) => {
  const html = generateSubmissionHTML(serviceData, formData, sections);

  console.log(`[PDF Service] Generating submission PDF using shared PDF generator...`);

  // Use shared PDF generator which has proper timeout settings for Docker
  const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');

  const pdfBuffer = await htmlToPdfBuffer(html, {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  });

  console.log('[PDF Service] Generated submission PDF, size:', pdfBuffer.length, 'bytes');

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('PDF buffer is empty');
  }

  return pdfBuffer;
};

module.exports = {
  generateServiceFormPDF,
  generateSubmissionPDF,
  generateFormHTML
};