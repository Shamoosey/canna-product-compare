import {inject, injectable} from "inversify";
import { Scraper } from "./interfaces";
import { Logger } from "winston";
import { BrowserHelper } from "./BrowserHelper";
import { Page } from "puppeteer";
import { CsvParser } from "./CsvParser";
import { ConfigService } from "./ConfigService";
import * as XLSX from "xlsx";
import * as fsExtra from "fs-extra";
import * as path from "path";

@injectable()
export class WebScraper implements Scraper.IWebScraper {
  private _browserHelper: Scraper.IBrowserHelper;
  private _logger: Logger;
  private _csvParser: Scraper.ICsvParser
  private _configService: Scraper.IConfigService

  constructor (
    @inject(BrowserHelper) browserHelper: Scraper.IBrowserHelper,
    @inject(Logger) logger: Logger,
    @inject (CsvParser) csvParser: Scraper.ICsvParser,
    @inject (ConfigService) configService: Scraper.IConfigService
) {
    this._browserHelper = browserHelper;
    this._logger = logger;
    this._csvParser = csvParser;
    this._configService = configService;
  }

  public async Run(): Promise<void>{
    this._logger.info("**App Started**")
    try {
      const csvData = await this._csvParser.ImportCsvData();
      if(csvData.size > 0){
        const page = await this._browserHelper.GetNewPage(this._configService.WebSiteURL);
        
        //click age verification button -- not actually a button for some reason...
        await page.evaluate((selector) => {
          (document.querySelector(selector) as any).click();
        }, this._configService.AgeVerificationButton);
  
        const productsMap = new Map<string, Scraper.ScrapedProduct[]>()
        for(const [key, value] of csvData){
          const products: Scraper.ScrapedProduct[] = [];
          for(const val of value){
            const result = await this.SearchProduct(page, val);
            if(result.ProductName){
              products.push(result);
            }
          }
          productsMap.set(key, products)
        }
  
        await this.exportToExcel(productsMap);
      }
    } catch (e) {
      this._logger.error("An uncaught exception occurred, unable to continue", e);
    }
  }


  private async exportToExcel(productData: Map<string, Scraper.ScrapedProduct[]>){
    this._logger.info(`Creating Xlsx file from product data map`);
    const workbook = XLSX.utils.book_new();

    productData.forEach((products, key) => {
      const worksheetData = products.map(product => ({
        ProductName: product.ProductName,
        OriginalPrice: product.OriginalPrice,
        OriginalAmount: product.OriginalAmount,
        UrlAmount: product.Amount,
        Highest: product.HighestPrice,
        Lowest: product.LowestPrice,
        ProductUrl: product.ProductUrl
      }));
  
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Calculate the maximum width for each column, including headers
      const headers = Object.keys(worksheetData[0]);
      const maxLengths = headers.map(header => header.length);

      worksheetData.forEach(row => {
        Object.values(row).forEach((value, index) => {
          const cellValue = typeof (value === 'object' && value !== null) ? value : value;
          maxLengths[index] = Math.max(maxLengths[index], cellValue.length);
        });
      });

      worksheet['!cols'] = maxLengths.map(length => ({ wch: length }));

      // Add hyperlinks to the ProductUrl column
      const productUrlColIndex = headers.indexOf('ProductUrl');
      worksheetData.forEach((row, rowIndex) => {
        const cellAddress = XLSX.utils.encode_cell({ c: productUrlColIndex, r: rowIndex + 1 });
        worksheet[cellAddress].l = { Target: row.ProductUrl, Tooltip: 'Click to open' };
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

  private async SearchProduct(page: Page, csvData: Scraper.CsvMetaData): Promise<Scraper.ScrapedProduct>{
    this._logger.info(`Searching for CSV data ${csvData.ProductName}`)
    let product: Scraper.ScrapedProduct;
    try {
      //search value using URL
      const searchBaseUrl = this._configService.SearchBaseUrl;
      await page.goto(`${searchBaseUrl}${csvData.ProductName}`, { waitUntil: "domcontentloaded" })
      

      await page.waitForSelector(this._configService.ProductResultItemSelector, { timeout: 10000 });
      await page.evaluate((selector) => {
        (document.querySelector(selector) as any).click();
      }, this._configService.ProductResultItemSelector);
      await page.waitForNavigation({
        waitUntil: "networkidle2"
      });

      //set pageination to 100 items
      const pageSelectorConfig = this._configService.PageSelectorConfig;
      await page.select(pageSelectorConfig.SelectorInput, pageSelectorConfig.PageValue);

      //get product first & last price
      const productPriceSelectors = this._configService.ProductPriceSelector;
      let firstPrice = await page.$eval(productPriceSelectors.FirstItem, el => el.innerHTML)
      let lastPrice = await page.$eval(productPriceSelectors.LastItem, el => el.innerHTML)
      let amount = await page.$eval(this._configService.AmountSelector, el => el.innerHTML)

      product = {
        ProductName: csvData.ProductName,
        ProductUrl: page.url(),
        HighestPrice: lastPrice,
        LowestPrice: firstPrice,
        OriginalAmount: csvData.ProductAmount,
        OriginalPrice: csvData.ProductPrice,
        Amount: amount
      }

    } catch (e){
      this._logger.error("An error occurred while searching for products", e)
    }

    this._logger.info("Successfully scraped product data", product)
    return product
  }
}