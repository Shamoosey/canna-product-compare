import moment from "moment";
import { createLogger, format, Logger, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

export abstract class LogFactory {
  private static tsFormat = moment().format('YYYY-MM-DD hh:mm:ss').trim();
  private static logLevel = "info"

  private static fileTransport = new DailyRotateFile ({
    filename: "webscraper-%DATE%.log",
    datePattern: "YYYY-MM-DD-HH",
    dirname: "./logs",
    maxFiles: '7d',
  });

  public static GetNewLogger(): Logger {
    let logger = createLogger({
      level: this.logLevel,
      transports: [
        this.fileTransport,
      ],
      format: this.getLogformat()
    })
    
    if(process.env.NODE_ENV.toLowerCase() == "dev"){
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