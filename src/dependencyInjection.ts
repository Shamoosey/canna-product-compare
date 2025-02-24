import "reflect-metadata";
import { Container } from "inversify";
import { WebScraper } from "./WebScraper"
import { BrowserHelper } from "./BrowserHelper";
import { Scraper } from "./interfaces"
import { Logger } from "winston";
import { LogFactory } from "./LogFactory";
import { ConfigService } from "./ConfigService";
import { CsvParser } from "./CsvParser";
import { ExcelService } from "./ExcelService";

let container = new Container();

container.bind<Scraper.IWebScraper>(WebScraper).toSelf().inSingletonScope();
container.bind<Scraper.IBrowserHelper>(BrowserHelper).toSelf().inSingletonScope();
container.bind<Logger>(Logger).toConstantValue(LogFactory.GetNewLogger());
container.bind<Scraper.IConfigService>(ConfigService).toSelf().inSingletonScope();
container.bind<Scraper.ICsvParser>(CsvParser).toSelf().inSingletonScope();
container.bind<Scraper.IExcelService>(ExcelService).toSelf().inSingletonScope();

export default container;