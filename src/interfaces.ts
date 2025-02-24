import { Browser, Page } from "puppeteer";

export namespace Scraper {
  export interface IWebScraper {
    Run(): Promise<void>;
  }

  export interface ICsvParser {
    ImportCsvData(): Promise<Map<string, CsvMetaData[]>>;
  }

  export interface IExcelService {
    ExportToXlsxFile(productData: Map<string, Scraper.ScrapedProduct[]>): Promise<void>;
  }

  export interface IBrowserHelper {
    GetBrowser(): Promise<Browser>;
    GetNewPage(url?: string): Promise<Page>;
  }

  export interface CsvMetaData{
    ProductName: string,
    ProductPrice: number,
    ProductAmount: string
  }

  export interface IConfigService {
    appSettings: AppSettings,  
    WebSiteURL: string
    AgeVerificationButton: string 
    SearchBaseUrl: string 
    ProductResultItemSelector: string  
    PageSelectorConfig: PageSelectorConfig,
    AmountSelector: string,
    ProductSortByPriceButton: string
    ProductPriceSelector: ProductPriceSelector
  }

  export interface AppSettings {
    importPath: string,
    outputPath: string
  }

  export interface ProductPriceSelector {
    FirstItem: string
    LastItem: string
  }

  export interface PageSelectorConfig {
    SelectorInput: string,
    PageValue: string
  }
  
  export interface StoredScrapedData {
    ItemType: string,
    ScrapedProducts: ScrapedProduct[]
  }

  export interface ScrapedProduct {
    ProductName: string,
    OriginalAmount: string,
    OriginalPrice: number,
    HighestPrice: number,
    LowestPrice: number,
    ProductUrl: string,
    Amount: string,
  }
}