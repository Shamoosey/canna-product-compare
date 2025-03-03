import moment from "moment";
import { createLogger, format, Logger, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from 'fs';
import path from 'path';

export abstract class LogFactory {
  private static tsFormat = moment().format('YYYY-MM-DD hh:mm:ss').trim();

  public static GetNewLogger(): Logger {
    const appSettingsPath = path.resolve(process.cwd(), './app-settings.json');
    const appSettings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf-8'));
    const transport = new DailyRotateFile ({
      filename: "webscraper-%DATE%.log",
      datePattern: "YYYY-MM-DD-HH",
      dirname: "./logs",
      maxFiles: '7d',
    });

    let logger = createLogger({
      level: "info",
      transports: [
        transport,
      ],
      format: this.getLogformat()
    })
    
    if(appSettings.debug){
      logger.add(new transports.Console())
      logger.level = "debug"
    }
    return logger;
  }

  private static getLogformat(){
    return format.combine(
      format.timestamp({format: this.tsFormat}),
      format.prettyPrint(),
      format.printf(({
        timestamp,
        level,
        message,
        ...meta
      }) => `${timestamp} | ${level} | ${message} ${this.formatMeta(meta)}`)
    )
  }

  private static formatMeta(meta:any){
    const splat = meta[Symbol.for('splat')];
    if (splat && splat.length) {
      return splat.length === 1 ? JSON.stringify(splat[0]) : JSON.stringify(splat);
    }
    return '';
  }
}