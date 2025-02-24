import { Browser, Page } from "puppeteer";

export namespace Scraper {
  export interface IWebScraper {
    Run(): Promise<void>;
  }

  export interface ICsvParser {
    ImportCsvData(): Promise<Map<string, CsvMetaData[]>>;
  }

  export interface IBrowserHelper {
    GetBrowser(): Promise<Browser>;
    GetNewPage(url?: string): Promise<Page>;
  }

  export interface CsvMetaData{
    ProductName: string,
    ProductPrice: string,
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
    OriginalPrice: string,
    HighestPrice: string,
    LowestPrice: string,
    ProductUrl: string,
    Amount: string,
  }
}