import fse from "fs-extra";
import path from "path";
import { inject, injectable } from "inversify";
import { Scraper } from "./interfaces";
import { Logger } from "winston";
import { ProductType } from "./ProductType";

@injectable()
export class ConfigService implements Scraper.IConfigService{
  private _logger: Logger;

  private settings: Scraper.AppSettings;

  constructor(
    @inject(Logger) logger: Logger
  ) {
    this._logger = logger;

    const filePath = path.resolve(__dirname, "../appSettings.json");
    const rawData = fse.readFileSync(filePath, "utf-8");
    this.settings = JSON.parse(rawData);
  }

  get appSettings(): Scraper.AppSettings {
    return this.settings;
  }

  get WebSiteURL(): string {
    return "https://hibuddy.ca/";
  } 
  get SearchBaseUrl(): string {
    return "https://hibuddy.ca/products/search?q="
  }

  get AgeVerificationButton(): string {
    return ".btn.btn-success" //not a btn, label
  }

  get ProductResultItemSelector(): string {
    return ".infinite-scroll-component a"
  }

  get PageSelectorConfig():  Scraper.PageSelectorConfig {
    return {
      SelectorInput: ".rdt_Pagination select",
      PageValue: "100" // view all
    }
  }

  get CategorySelectors(): Map<ProductType, string> {
    const categorySelectors = new Map<ProductType, string>([
      [ProductType.Flower, "input[value='Flower']"],
      [ProductType.VapeCart, "input[value='Vapes']"],
      [ProductType.PreRolls, "input[value='Pre-Rolls']"],
    ]);
    return categorySelectors;
  }

  get AmountSelector(): string {
    return ".tab-active"
  }

  get ProductSortByPriceButton(): string {
    return "header button:last-child"
  }

  get ProductPriceSelector(): Scraper.ProductPriceSelector{
    return {
      FirstItem: ".rdt_TableBody .rdt_TableRow:first-child .rdt_TableCell:nth-child(2) .flex div:first-child",
      LastItem: ".rdt_TableBody .rdt_TableRow:last-child .rdt_TableCell:nth-child(2) .flex div:first-child"
    }
  }
}
