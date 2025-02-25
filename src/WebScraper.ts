import {inject, injectable} from "inversify";
import { Scraper } from "./interfaces";
import { Logger } from "winston";
import { BrowserHelper } from "./BrowserHelper";
import { Browser, Page } from "puppeteer";
import { CsvParser } from "./CsvParser";
import { ConfigService } from "./ConfigService";
import { ExcelService } from "./ExcelService";
import { ProductType } from "./ProductType";

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
    var productsMap = new Map<string, Scraper.ScrapedProduct[]>()
    try {
      const csvData = await this._csvParser.ImportCsvData();
      if(csvData.size > 0){
        this._logger.info("Starting product scrap flow")
        const pinckyPromises = new Array<Promise<Map<string, Scraper.ScrapedProduct[]>>>();
        const browser = await this._browserHelper.GetBrowser();
        for(const [key, value] of csvData){
          pinckyPromises.push(this.SearchProducts(browser, key, value))
        }

        const productsResult = await Promise.all(pinckyPromises);
        for (const productMap of productsResult) {
          for (const [key, value] of productMap) {
            productsMap.set(key, value)
          }
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

  private async SearchProducts(browser:Browser, productType:string, productCsv: Scraper.CsvMetaData[]): Promise<Map<string, Scraper.ScrapedProduct[]>>{
    this._logger.info(`Starting browser search flow for ${productType}`)
    const page = await this._browserHelper.GetNewPage(browser, this._configService.WebSiteURL);

    //click age verification button -- not actually a button for some reason...
    await page.evaluate((selector) => {
      (document.querySelector(selector) as any).click();
    }, this._configService.AgeVerificationButton);

    const products = new Array<Scraper.ScrapedProduct>();
    try {
      for (const csvData of productCsv) {
        this._logger.info(`Searching for CSV data ${csvData.ProductName}`)
        let product: Scraper.ScrapedProduct;
        try {
          //search value using URL
          const searchBaseUrl = this._configService.SearchBaseUrl;
          await page.goto(`${searchBaseUrl}${csvData.ProductName}`, { waitUntil: "domcontentloaded" })

          const productTypeSelector = this._configService.CategorySelectors.get(productType as ProductType)
          if(productTypeSelector != undefined){
            //if productType has selector wait for load and click on category 
            await page.waitForSelector(productTypeSelector, { timeout: 10000 });
            await page.evaluate((selector) => {
              (document.querySelector(selector) as any).click();
            }, productTypeSelector);
          } else {
            this._logger.warn(`Missing product type map for category selector ${productType}`)
          }

          //click on the first product in the result 
          await page.waitForSelector(this._configService.ProductResultItemSelector, { timeout: 10000 });
          await page.evaluate((selector) => {
            (document.querySelector(selector) as any).click();
          }, this._configService.ProductResultItemSelector);
          await page.waitForNavigation({
            waitUntil: "networkidle2"
          });
    
          //set store pageination to 100 items
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

          this._logger.info("Successfully scraped product data", product)
        } catch (e){
          this._logger.error("An error occurred while searching for products", e)
          if(!product){
            product = {
              OriginalAmount: csvData.ProductAmount,
              OriginalPrice: csvData.ProductPrice,
              ProductName: csvData.ProductName,
              HighestPrice: null,
              LowestPrice: null,
              Amount: null,
              ProductUrl: page.url(),
            }
          }
        }
        products.push(product)
      }
    } catch (e){
      this._logger.error(`An error occured while searching for ${productType}`, e);
    }
    await page.close();

    const productsMap = new Map<string, Scraper.ScrapedProduct[]>();
    productsMap.set(productType, products)

    return productsMap
  }
}