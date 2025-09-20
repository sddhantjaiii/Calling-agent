import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportService, ExportData, ExportOptions } from '../exportService';

describe('ExportService', () => {
  const mockExportData: ExportData = {
    headers: ['Name', 'Email', 'Status', 'Created'],
    rows: [
      ['John Doe', 'john@example.com', 'Active', '2024-01-01'],
      ['Jane Smith', 'jane@example.com', 'Inactive', '2024-01-02'],
      ['Bob Johnson', 'bob@example.com', 'Active', '2024-01-03']
    ],
    metadata: {
      title: 'User Report',
      description: 'List of all users',
      generatedAt: new Date('2024-01-15T10:00:00Z'),
      filters: [
        { label: 'Status', value: 'All' },
        { label: 'Date Range', value: 'Last 30 days' }
      ]
    },
    charts: [
      {
        id: 'chart-1',
        type: 'bar',
        title: 'Users by Status',
        data: [
          { name: 'Active', value: 2 },
          { name: 'Inactive', value: 1 }
        ],
        config: {}
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToCSV', () => {
    it('exports data to CSV format', async () => {
      const options: ExportOptions = { format: 'csv' };
      const blob = await ExportService.exportToCSV(mockExportData, options);
      
      expect(blob.type).toBe('text/csv;charset=utf-8;');
      
      const text = await blob.text();
      expect(text).toContain('# User Report');
      expect(text).toContain('# List of all users');
      expect(text).toContain('"Name","Email","Status","Created"');
      expect(text).toContain('"John Doe","john@example.com","Active","2024-01-01"');
    });

    it('handles null and undefined values', async () => {
      const dataWithNulls: ExportData = {
        headers: ['Name', 'Value'],
        rows: [
          ['Test', null],
          ['Test2', undefined],
          ['Test3', '']
        ]
      };
      
      const blob = await ExportService.exportToCSV(dataWithNulls);
      const text = await blob.text();
      
      expect(text).toContain('"Test",');
      expect(text).toContain('"Test2",');
      expect(text).toContain('"Test3",""');
    });

    it('escapes quotes in CSV data', async () => {
      const dataWithQuotes: ExportData = {
        headers: ['Name', 'Description'],
        rows: [
          ['John "Johnny" Doe', 'Says "Hello World"']
        ]
      };
      
      const blob = await ExportService.exportToCSV(dataWithQuotes);
      const text = await blob.text();
      
      expect(text).toContain('"John ""Johnny"" Doe"');
      expect(text).toContain('"Says ""Hello World"""');
    });
  });

  describe('exportToExcel', () => {
    it('exports data to Excel format', async () => {
      const options: ExportOptions = { format: 'excel' };
      const blob = await ExportService.exportToExcel(mockExportData, options);
      
      expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('exportToPDF', () => {
    it('exports data to PDF format', async () => {
      const options: ExportOptions = { format: 'pdf', includeCharts: true };
      const blob = await ExportService.exportToPDF(mockExportData, options);
      
      expect(blob.type).toBe('text/html');
      
      const html = await blob.text();
      expect(html).toContain('<title>User Report</title>');
      expect(html).toContain('<h1>User Report</h1>');
      expect(html).toContain('<p>List of all users</p>');
      expect(html).toContain('<th>Name</th>');
      expect(html).toContain('<td>John Doe</td>');
    });

    it('includes charts when enabled', async () => {
      const options: ExportOptions = { format: 'pdf', includeCharts: true };
      const blob = await ExportService.exportToPDF(mockExportData, options);
      
      const html = await blob.text();
      expect(html).toContain('<h2>Visualizations</h2>');
      expect(html).toContain('<h3>Users by Status</h3>');
      expect(html).toContain('Chart Type: BAR');
    });

    it('excludes raw data when disabled', async () => {
      const options: ExportOptions = { format: 'pdf', includeRawData: false };
      const blob = await ExportService.exportToPDF(mockExportData, options);
      
      const html = await blob.text();
      expect(html).not.toContain('<h2>Data</h2>');
      expect(html).not.toContain('<table>');
    });
  });

  describe('exportReport', () => {
    it('exports CSV report with correct filename', async () => {
      const options: ExportOptions = { format: 'csv', filename: 'users' };
      const result = await ExportService.exportReport(mockExportData, options);
      
      expect(result.filename).toBe('users.csv');
      expect(result.blob.type).toBe('text/csv;charset=utf-8;');
    });

    it('exports Excel report with correct filename', async () => {
      const options: ExportOptions = { format: 'excel', filename: 'users' };
      const result = await ExportService.exportReport(mockExportData, options);
      
      expect(result.filename).toBe('users.xlsx');
      expect(result.blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('exports PDF report with correct filename', async () => {
      const options: ExportOptions = { format: 'pdf', filename: 'users' };
      const result = await ExportService.exportReport(mockExportData, options);
      
      expect(result.filename).toBe('users.pdf');
      expect(result.blob.type).toBe('text/html');
    });

    it('generates default filename with timestamp', async () => {
      const options: ExportOptions = { format: 'csv' };
      const result = await ExportService.exportReport(mockExportData, options);
      
      expect(result.filename).toMatch(/^report_\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('throws error for unsupported format', async () => {
      const options: ExportOptions = { format: 'xml' as any };
      
      await expect(ExportService.exportReport(mockExportData, options))
        .rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('downloadBlob', () => {
    it('creates download link and triggers download', () => {
      const mockBlob = new Blob(['test'], { type: 'text/plain' });
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      
      ExportService.downloadBlob(mockBlob, 'test.txt');
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.download).toBe('test.txt');
      expect(mockLink.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(revokeObjectURLSpy).toHaveBeenCalled();
      
      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('validateExportData', () => {
    it('validates valid export data', () => {
      const result = ExportService.validateExportData(mockExportData);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects missing headers', () => {
      const invalidData: ExportData = {
        headers: [],
        rows: [['data']]
      };
      
      const result = ExportService.validateExportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Headers are required');
    });

    it('detects missing rows', () => {
      const invalidData: ExportData = {
        headers: ['Name'],
        rows: []
      };
      
      const result = ExportService.validateExportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one row of data is required');
    });

    it('detects mismatched column count', () => {
      const invalidData: ExportData = {
        headers: ['Name', 'Email'],
        rows: [
          ['John', 'john@example.com'], // Valid
          ['Jane'], // Invalid - missing column
          ['Bob', 'bob@example.com', 'extra'] // Invalid - extra column
        ]
      };
      
      const result = ExportService.validateExportData(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('2 rows have mismatched column count');
    });
  });

  describe('getMimeType', () => {
    it('returns correct MIME types', () => {
      expect(ExportService.getMimeType('csv')).toBe('text/csv');
      expect(ExportService.getMimeType('excel')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(ExportService.getMimeType('pdf')).toBe('application/pdf');
    });

    it('returns default MIME type for unknown format', () => {
      expect(ExportService.getMimeType('unknown' as any)).toBe('application/octet-stream');
    });
  });

  describe('estimateFileSize', () => {
    it('estimates file size correctly', () => {
      const size = ExportService.estimateFileSize(mockExportData, 'csv');
      
      // 4 headers + 12 data cells = 16 cells
      // 16 * 10 (avg chars) * 1 (CSV multiplier) = 160 bytes
      expect(size).toBe(160);
    });

    it('applies format-specific multipliers', () => {
      const csvSize = ExportService.estimateFileSize(mockExportData, 'csv');
      const excelSize = ExportService.estimateFileSize(mockExportData, 'excel');
      const pdfSize = ExportService.estimateFileSize(mockExportData, 'pdf');
      
      expect(excelSize).toBe(csvSize * 2.5);
      expect(pdfSize).toBe(csvSize * 3);
    });
  });

  describe('exportCharts', () => {
    it('exports charts as blobs', async () => {
      const charts = mockExportData.charts!;
      const blobs = await ExportService.exportCharts(charts, 'png');
      
      expect(blobs).toHaveLength(1);
      expect(blobs[0].type).toBe('image/png');
    });

    it('handles empty charts array', async () => {
      const blobs = await ExportService.exportCharts([], 'png');
      
      expect(blobs).toHaveLength(0);
    });

    it('handles undefined charts', async () => {
      const blobs = await ExportService.exportCharts(undefined, 'png');
      
      expect(blobs).toHaveLength(0);
    });
  });

  describe('compressExport', () => {
    it('returns original blob (placeholder implementation)', async () => {
      const originalBlob = new Blob(['test'], { type: 'text/plain' });
      const compressedBlob = await ExportService.compressExport(originalBlob);
      
      expect(compressedBlob).toBe(originalBlob);
    });
  });
});