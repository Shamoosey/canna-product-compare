import {inject, injectable} from "inversify";
import { Scraper } from "./interfaces";
import { Logger } from "winston";
import { ConfigService } from "./ConfigService";
import fs from 'fs-extra';
import path from 'path';
import csv from 'csv-parser';

@injectable()
export class CsvParser implements Scraper.ICsvParser {
  private _logger: Logger;
  private _configService: Scraper.IConfigService

  constructor (
    @inject(Logger) logger: Logger,
    @inject (ConfigService) configService: Scraper.IConfigService
) {
    this._logger = logger;
    this._configService = configService;
  }

  public async ImportCsvData(): Promise<Map<string, Scraper.CsvMetaData[]>>{
    this._logger.info(`Starting CSV import process`);
    let productMap = new Map<string, Scraper.CsvMetaData[]>();

    const appSettings = this._configService.appSettings;
    const importPathValid = await fs.pathExists(appSettings.importPath);
    try {
      if(importPathValid){
        const files = await fs.readdir(appSettings.importPath);
        const csvFiles = files.filter(file => file.endsWith('.csv'));
        this._logger.info(`Found ${csvFiles.length} CSV files`)

        for (const file of csvFiles) {
          const filePath = path.join(appSettings.importPath, file);
          this._logger.info(`Processing: ${file}`);
          const csvData = await this.parseCsv(filePath);

          for(const [key, value] of csvData){
            if(productMap.has(key)){
              const mapItems = productMap.get(key);
              mapItems.push(...value);
              productMap.set(key, mapItems)
            } else {
              productMap.set(key, [ ...value ])
            }
          }
          this._logger.info(`Finished parsing data for ${file}`);
        }
      } else {
        this._logger.info("Import path is not set, unable to import csv files")
      }
    } catch (error) {
      this._logger.error('Error processing CSV files:', error);
    }
    return productMap;
  }

  private async parseCsv(filePath: string): Promise<Map<string, Scraper.CsvMetaData[]>> {
    const productMap = new Map<string, Scraper.CsvMetaData[]>();
    const stream = fs.createReadStream(filePath).pipe(csv());
    let headers: string[] = [];
    let foundHeaders = false;
    
    let classificationIndex = -1;
    let productNameIndex = -1;
    let priceIndex = -1;

    for await (const row of stream) {
      if (!foundHeaders) {
        headers = Object.values(row);
        classificationIndex = headers.indexOf("Classification")
        productNameIndex = headers.indexOf("Product")
        priceIndex = headers.indexOf("Regular Price")

        if (headers.includes('Product') && headers.includes('Classification')) {
          foundHeaders = true;
        }
        continue;
      }

      if (foundHeaders) {
        const rowVals = Object.values(row);
        const productType = rowVals[classificationIndex] as string
        const productName = rowVals[productNameIndex] as string
        const productPrice = rowVals[priceIndex] as number
        if(productType != undefined && productName != undefined && productPrice != undefined){
          const product: Scraper.CsvMetaData = {
            ProductName: productName,
            ProductPrice: productPrice,
            ProductAmount: productName.substring((productName.lastIndexOf("-") + 1), productName.length).trim()
          }
          if(productMap.has(productType)){
            const mapItems = productMap.get(productType);
            mapItems.push(product);
            productMap.set(productType, mapItems)
          } else {
            productMap.set(productType, [ product ])
          }
        }
      }
    }

    if (!foundHeaders) {
      throw new Error('CSV does not contain required columns: Product, Classification');
    }

    return productMap;
  }
}