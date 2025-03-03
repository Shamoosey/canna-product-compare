## Product compare CSV parser and webscraper application

Application for parsing CSV data, scraping related data and adding the results to an xlsx sheet for comparison

#### NPM Commands
`npm run serve` - Runs the app
`npm run build` - Builds the app

### Build exe file cmd 
`pkg ./dist/index.js --output ./canna-scraper.exe --targets node16 --public`

### To-Do
- Figure out sub mapping for product weight
- Add flag column/color to excel for incorrect data

App settings configuration 

debug : output additional logs for debugging
logPath : path to folder for log files
importPath : path to folder for imported csv files
outputPath : path to folder for exported xlsx files