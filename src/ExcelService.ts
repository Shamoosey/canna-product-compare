import {inject, injectable} from "inversify";
import { Scraper } from "./interfaces";
import { Logger } from "winston";
import { ConfigService } from "./ConfigService";
import * as XLSX from "xlsx-js-style";
import * as fsExtra from "fs-extra";
import * as path from "path";

@injectable()
export class ExcelService implements Scraper.IExcelService {
  private _logger: Logger;
  private _configService: Scraper.IConfigService

  constructor (
    @inject(Logger) logger: Logger,
    @inject (ConfigService) configService: Scraper.IConfigService
) {
    this._logger = logger;
    this._configService = configService;
  }

  public async ExportToXlsxFile(productData: Map<string, Scraper.ScrapedProduct[]>): Promise<void> {
    this._logger.info(`Creating Xlsx file from product data map`);
    const workbook = XLSX.utils.book_new();

    productData.forEach((products, key) => {
      const worksheetData = products.map(product => ({
      ProductName: product.ProductName,
      OriginalPrice: product.OriginalPrice,
      OriginalAmount: product.OriginalAmount,
      UrlAmount: product.Amount,
      Lowest: product.LowestPrice,
      Highest: product.HighestPrice,
      ProductUrl: product.ProductUrl
      }));
    
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Calculate the maximum width for each column, including headers
      const headers = Object.keys(worksheetData[0]);
      const maxLengths = headers.map(header => header.length);

      worksheetData.forEach(row => {
        Object.values(row).forEach((value, index) => {
          const cellValue = typeof (value === 'object' && value !== null) ? value : value;
          maxLengths[index] = Math.max(maxLengths[index], cellValue.toString().length);
        });
      });

      worksheet['!cols'] = maxLengths.map(length => ({ wch: length }));

      // Add hyperlinks to the ProductUrl column
      const productUrlColIndex = headers.indexOf('ProductUrl');
      worksheetData.forEach((row, rowIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ c: productUrlColIndex, r: rowIndex + 1 });
        worksheet[cellAddress].l = { Target: row.ProductUrl, Tooltip: 'Click to open' };
      });

      // Apply background colors
      const applyBgColor = (cell, color) => {
        if (!worksheet[cell]) worksheet[cell] = { v: "", t: "s" }; // Ensure the cell exists
        worksheet[cell].s = {
          fill: {
            type: "pattern",
            patternType: "solid",
            fgColor: { rgb: color }
          }
        };
      };

      worksheetData.forEach((row, rowIndex) => {
        const productNameCell = XLSX.utils.encode_cell({ c: headers.indexOf('ProductName'), r: rowIndex + 1 });
        const originalAmountCell = XLSX.utils.encode_cell({ c: headers.indexOf('OriginalAmount'), r: rowIndex + 1 });
        const originalPriceCell = XLSX.utils.encode_cell({ c: headers.indexOf('OriginalPrice'), r: rowIndex + 1 });
      
        const green = "6FFF94"
        const blue = "6FF8FF"
        applyBgColor(productNameCell, green);
        applyBgColor(originalAmountCell, green);
        applyBgColor(originalPriceCell, green); 
        
        headers.forEach((header, colIndex) => {
          if (header !== 'ProductName' && header !== 'OriginalAmount' && header !== 'OriginalPrice') {
            const cell = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
            applyBgColor(cell, blue);
          }
        });
      });

      XLSX.utils.book_append_sheet(workbook, worksheet, key);
    });
    
    const outputPath = this._configService.appSettings.outputPath;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const filePath = path.join(this._configService.appSettings.outputPath, `ScrapedProducts-${formattedDate}.xlsx`);

    await fsExtra.ensureDir(outputPath);
    XLSX.writeFile(workbook, filePath)

    this._logger.info(`Xlsx file saved to ${filePath}`);
  }
}