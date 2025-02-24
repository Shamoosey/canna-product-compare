require('dotenv').config();
import container from "./dependencyInjection";
import { Scraper } from "./interfaces"
import { WebScraper } from "./WebScraper";

let scraper = container.get<Scraper.IWebScraper>(WebScraper)

scraper.Run();