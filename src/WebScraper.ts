import {inject, injectable} from "inversify";
import { Scraper } from "./interfaces";
import { Logger } from "winston";
import { BrowserHelper } from "./BrowserHelper";
import { Page } from "puppeteer";
import { CsvParser } from "./CsvParser";
import { ConfigService } from "./ConfigService";
import { ExcelService } from "./ExcelService";

@injectable()
export class WebScraper implements Scraper.IWebScraper {
  private _browserHelper: Scraper.IBrowserHelper;
  private _logger: Logger;
  private _csvParser: Scraper.ICsvParser
  private _configService: Scraper.IConfigService
  private _excelService: Scraper.IExcelService

  constructor (
    @inject(BrowserHelper) browserHelper: Scraper.IBrowserHelper,
    @inject(Logger) logger: Logger,
    @inject (CsvParser) csvParser: Scraper.ICsvParser,
    @inject (ConfigService) configService: Scraper.IConfigService,
    @inject (ExcelService) excelService: Scraper.IExcelService
) {
    this._browserHelper = browserHelper;
    this._logger = logger;
    this._csvParser = csvParser;
    this._configService = configService;
    this._excelService = excelService;
  }

  public async Run(): Promise<void>{
    this._logger.info("**App Started**")
    const productsMap = new Map<string, Scraper.ScrapedProduct[]>()

    try {
      const csvData = await this._csvParser.ImportCsvData();
      if(csvData.size > 0){
        const page = await this._browserHelper.GetNewPage(this._configService.WebSiteURL);
        
        //click age verification button -- not actually a button for some reason...
        await page.evaluate((selector) => {
          (document.querySelector(selector) as any).click();
        }, this._configService.AgeVerificationButton);
  
        this._logger.info("Starting product scrap flow")
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
        this._logger.info(`Completed scraping product information, got ${productsMap.size} products`)
      } else {
        this._logger.info("No CSV data, unable to scrape product information")
      }
    } catch (e) {
      this._logger.error("An uncaught exception occurred while scraping product information", e);
    }

    try {
      await this._excelService.ExportToXlsxFile(productsMap);
    } catch (e) {
      this._logger.error("An uncaught exception occurred while exporting product data to xlsx file", e);
    }

    this._logger.info("** Job Complete **")
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

      const firstPriceNumber = Number.parseFloat(firstPrice.replace("$", ""))
      const lastPriceNumber = Number.parseFloat(lastPrice.replace("$", ""))
      product = {
        ProductName: csvData.ProductName,
        ProductUrl: page.url(),
        HighestPrice: lastPriceNumber,
        LowestPrice: firstPriceNumber,
        OriginalAmount: csvData.ProductAmount,
        OriginalPrice: csvData.ProductPrice,
        Amount: amount
      }

    } catch (e){
      this._logger.error("An error occurred while searching for products", e)
      if(!product){
        product = {
          ProductName: csvData.ProductName,
          ProductUrl: page.url(),
          HighestPrice: null,
          LowestPrice: null,
          Amount: null,
          OriginalAmount: csvData.ProductAmount,
          OriginalPrice: csvData.ProductPrice,
        }
      }
    }

    this._logger.info("Successfully scraped product data", product)
    return product
  }
}