import {inject, injectable} from "inversify";
import { Logger } from "winston";
import { Scraper } from "./interfaces";
import Puppeteer from "puppeteer-extra";
import { Browser, Page } from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

@injectable()
export class BrowserHelper implements Scraper.IBrowserHelper{
  private _logger: Logger;
  private _browserInstance : Browser;

  constructor (
    @inject(Logger) logger: Logger
  ) {
    this._logger = logger;
    Puppeteer.use(StealthPlugin());
  }

  public async GetBrowser(): Promise<Browser> {
    if(this._browserInstance == undefined){
      this._logger.info("Creating browser instance")
      this._browserInstance = await Puppeteer.launch({
        headless: false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
        ]
      });
    }
    return this._browserInstance
  }

  public async GetNewPage(browser: Browser, url?: string): Promise<Page> {
    this._logger.info("Creating new browser page")
    let page =  await browser.newPage();
    
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.google.com/",
    });

    // Enable JavaScript execution (sometimes required)
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes("sentry.io") || url.includes("session-replay")) {
          this._logger.debug(`Blocking Sentry URL: ${url}`);
          req.abort();
      } else {
          req.continue();
      }
    });

    if(url){
      this._logger.info(`Loading new page ${url}`)
      await page.goto(url, {waitUntil: `networkidle2`});
    }
    return page;
  }
}