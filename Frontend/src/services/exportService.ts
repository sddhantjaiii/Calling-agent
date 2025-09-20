import { adminApiService } from './adminApiService';

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  filename?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  compression?: boolean;
}

export interface ExportData {
  headers: string[];
  rows: any[][];
  metadata?: {
    title?: string;
    description?: string;
    generatedAt?: Date;
    filters?: any[];
  };
  charts?: {
    id: string;
    type: 'line' | 'bar' | 'pie' | 'area';
    title: string;
    data: any[];
    config: any;
  }[];
}

export class ExportService {
  /**
   * Export data to CSV format
   */
  static async exportToCSV(data: ExportData, options: ExportOptions = { format: 'csv' }): Promise<Blob> {
    const { headers, rows, metadata } = data;
    let csvContent = '';

    // Add metadata as comments
    if (metadata) {
      if (metadata.title) csvContent += `# ${metadata.title}\n`;
      if (metadata.description) csvContent += `# ${metadata.description}\n`;
      if (metadata.generatedAt) csvContent += `# Generated: ${metadata.generatedAt.toISOString()}\n`;
      csvContent += '\n';
    }

    // Add headers
    csvContent += headers.map(header => `"${header}"`).join(',') + '\n';

    // Add rows
    rows.forEach(row => {
      const csvRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'string') return `"${cell.replace(/"/g, '""')}"`;
        return String(cell);
      }).join(',');
      csvContent += csvRow + '\n';
    });

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Export data to Excel format
   */
  static async exportToExcel(data: ExportData, options: ExportOptions = { format: 'excel' }): Promise<Blob> {
    // For now, we'll use CSV format as a fallback
    // In a real implementation, you'd use a library like xlsx or exceljs
    const csvBlob = await this.exportToCSV(data, options);
    return new Blob([await csvBlob.arrayBuffer()], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  }

  /**
   * Export data to PDF format
   */
  static async exportToPDF(data: ExportData, options: ExportOptions = { format: 'pdf' }): Promise<Blob> {
    // This would typically use a library like jsPDF or call a backend service
    // For now, we'll create a simple HTML-based PDF
    const htmlContent = this.generateHTMLReport(data, options);
    
    // In a real implementation, you'd convert HTML to PDF
    // For now, return HTML as blob
    return new Blob([htmlContent], { type: 'text/html' });
  }

  /**
   * Generate HTML report content
   */
  private static generateHTMLReport(data: ExportData, options: ExportOptions): string {
    const { headers, rows, metadata, charts } = data;
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${metadata?.title || 'Report'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .metadata { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .chart-placeholder { 
            border: 2px dashed #ccc; 
            padding: 40px; 
            text-align: center; 
            margin: 20px 0; 
            background: #f9f9f9;
          }
        </style>
      </head>
      <body>
    `;

    // Header
    html += '<div class="header">';
    if (metadata?.title) {
      html += `<h1>${metadata.title}</h1>`;
    }
    if (metadata?.description) {
      html += `<p>${metadata.description}</p>`;
    }
    html += '</div>';

    // Metadata
    if (metadata) {
      html += '<div class="metadata">';
      html += `<p><strong>Generated:</strong> ${metadata.generatedAt?.toLocaleString() || new Date().toLocaleString()}</p>`;
      if (metadata.filters && metadata.filters.length > 0) {
        html += '<p><strong>Filters Applied:</strong></p><ul>';
        metadata.filters.forEach(filter => {
          html += `<li>${filter.label}: ${filter.value}</li>`;
        });
        html += '</ul>';
      }
      html += '</div>';
    }

    // Charts (if enabled and available)
    if (options.includeCharts && charts && charts.length > 0) {
      html += '<h2>Visualizations</h2>';
      charts.forEach(chart => {
        html += `
          <div class="chart-placeholder">
            <h3>${chart.title}</h3>
            <p>Chart Type: ${chart.type.toUpperCase()}</p>
            <p>Data Points: ${chart.data.length}</p>
            <small>Note: Charts are not rendered in this export format</small>
          </div>
        `;
      });
    }

    // Data table (if enabled)
    if (options.includeRawData !== false) {
      html += '<h2>Data</h2>';
      html += '<table>';
      
      // Headers
      html += '<thead><tr>';
      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += '</tr></thead>';
      
      // Rows
      html += '<tbody>';
      rows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += `<td>${cell || ''}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
      
      html += '</table>';
    }

    html += '</body></html>';
    return html;
  }

  /**
   * Download exported data
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export report data with the specified format
   */
  static async exportReport(
    data: ExportData, 
    options: ExportOptions
  ): Promise<{ blob: Blob; filename: string }> {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = options.filename || `report_${timestamp}`;
    
    let blob: Blob;
    let filename: string;

    switch (options.format) {
      case 'csv':
        blob = await this.exportToCSV(data, options);
        filename = `${baseFilename}.csv`;
        break;
      case 'excel':
        blob = await this.exportToExcel(data, options);
        filename = `${baseFilename}.xlsx`;
        break;
      case 'pdf':
        blob = await this.exportToPDF(data, options);
        filename = `${baseFilename}.pdf`;
        break;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return { blob, filename };
  }

  /**
   * Export data visualization charts
   */
  static async exportCharts(
    charts: ExportData['charts'], 
    format: 'png' | 'svg' | 'pdf' = 'png'
  ): Promise<Blob[]> {
    // This would typically capture chart elements as images
    // For now, return empty blobs as placeholders
    return charts?.map(() => new Blob([''], { type: `image/${format}` })) || [];
  }

  /**
   * Compress exported data
   */
  static async compressExport(blob: Blob): Promise<Blob> {
    // This would typically use a compression library
    // For now, return the original blob
    return blob;
  }

  /**
   * Validate export data
   */
  static validateExportData(data: ExportData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.headers || data.headers.length === 0) {
      errors.push('Headers are required');
    }

    if (!data.rows || data.rows.length === 0) {
      errors.push('At least one row of data is required');
    }

    if (data.rows && data.headers) {
      const headerCount = data.headers.length;
      const invalidRows = data.rows.filter(row => row.length !== headerCount);
      if (invalidRows.length > 0) {
        errors.push(`${invalidRows.length} rows have mismatched column count`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get export format MIME types
   */
  static getMimeType(format: ExportOptions['format']): string {
    const mimeTypes = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf'
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  /**
   * Estimate export file size
   */
  static estimateFileSize(data: ExportData, format: ExportOptions['format']): number {
    const { headers, rows } = data;
    const totalCells = (headers.length * rows.length) + headers.length;
    const avgCellSize = 10; // Average characters per cell
    
    const baseSize = totalCells * avgCellSize;
    
    // Format-specific multipliers
    const multipliers = {
      csv: 1,
      excel: 2.5,
      pdf: 3
    };
    
    return Math.round(baseSize * (multipliers[format] || 1));
  }
}

export default ExportService;