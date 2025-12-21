/**
 * CSV download utilities
 *
 * Handles generation and download of CSV files with proper encoding
 * and Excel compatibility.
 */

/**
 * Downloads a CSV template file to the user's computer
 *
 * Features:
 * - UTF-8 BOM for Excel compatibility
 * - Proper CSV escaping for cells with commas/quotes
 * - Automatic download trigger
 *
 * @param headers - Array of column headers
 * @param sampleRows - Array of sample data rows
 * @param filename - Name for the downloaded file
 */
export function downloadCSVTemplate(
  headers: string[],
  sampleRows: string[][],
  filename: string
): void {
  // Helper function to escape CSV cells
  const escapeCSVCell = (cell: string): string => {
    const str = String(cell);

    // If cell contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  // Build CSV content
  const csvRows = [
    // Header row
    headers.map(escapeCSVCell).join(','),
    // Sample data rows
    ...sampleRows.map((row) => row.map(escapeCSVCell).join(','))
  ];

  const csvContent = csvRows.join('\n');

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  // Create download link and trigger
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  URL.revokeObjectURL(url);
}

/**
 * Downloads error rows as CSV for re-import after correction
 *
 * @param headers - Column headers (with "ERROR_MESSAGE" appended)
 * @param errorRows - Rows that failed validation with error messages
 * @param filename - Name for the downloaded file
 */
export function downloadErrorCSV(
  headers: string[],
  errorRows: Array<{ data: Record<string, any>; error: string }>,
  filename: string = `import_errors_${Date.now()}.csv`
): void {
  const headersWithError = [...headers, 'ERROR_MESSAGE'];

  const dataRows = errorRows.map((errorRow) => {
    const rowValues = headers.map((header) => String(errorRow.data[header] || ''));
    return [...rowValues, errorRow.error];
  });

  downloadCSVTemplate(headersWithError, dataRows, filename);
}

/**
 * Creates a downloadable CSV from validation results
 *
 * @param validationResults - Array of validated rows with errors
 * @param originalHeaders - Original CSV headers
 * @param filename - Name for downloaded file
 */
export function downloadValidationErrors(
  validationResults: Array<{
    rowIndex: number;
    originalData: Record<string, any>;
    errors: Array<{ field: string; message: string }>;
  }>,
  originalHeaders: string[],
  filename: string = `validation_errors_${Date.now()}.csv`
): void {
  const headersWithErrors = [
    'ROW_NUMBER',
    ...originalHeaders,
    'ERROR_FIELD',
    'ERROR_MESSAGE'
  ];

  const errorRows = validationResults.flatMap((result) => {
    return result.errors.map((error) => {
      const rowData = originalHeaders.map(
        (header) => String(result.originalData[header] || '')
      );
      return [
        String(result.rowIndex + 2), // +2 because row 1 is header, and we're 0-indexed
        ...rowData,
        error.field,
        error.message
      ];
    });
  });

  downloadCSVTemplate(headersWithErrors, errorRows, filename);
}
