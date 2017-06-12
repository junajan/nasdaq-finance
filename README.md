# Nasdaq Finance

This tool will help to download informations like an actual price, stock info or daily tick prices and volumes for a given ticker(s).

## Install
```bash
$ npm install --save nasdaq-finance
```

## Configuration
`NasdaqFinance` class takes one argument with a configuration object containing these values:
```js
{
  logLevel: 'info',
  tickerConcurrency: 4,
  requestConcurrency: 4,
  requestDelay: 50
}
```

## API
`NasdaqFinance` object has three main methods:
- getInfo - will return an object with basic info about ticker(s)
- getPrice - will return a current price displayed on a Nasdaq page.
- getTicks - get ticks data (time, price, volume) for a given ticker(s)

## Example usage
All three methods accepts two arguments. First is a single ticker or an array of all tickers which should be fetched. The second argument is a boolean which modifies the result from array to object indexed by tickers. More info bellow in the usage examples.

### Stock info
Will return a stock info about a requested 
```js
import nf from 'nasdaq-finance'
const nf = new NasdaqFinance()
nf.getInfo('TSLA')
.then((res) => {
//  res == {
//    name: 'Tesla, Inc.  (TSLA)',
//    exchange: 'NASDAQ',
//    industry: 'Capital Goods',
//    image: 'http://www.nasdaq.com/logos/TSLA.gif',
//    price: 357.32,
//    priceChange: '12.68',
//    priceChangePercent: '3.43'
//  }
})
.catch(console.error)
```

### Stock price
Will return a current stock price listed on nasdaq page.
```js
import nf from 'nasdaq-finance'
const nf = new NasdaqFinance()
nf.getInfo('TSLA')
.then((res) => {
//  res === 357.32
})
.catch(console.error)
```

### Stock ticks

## Contribution
Tests: npm test
And as always .. PRs more than welcomed :-)
