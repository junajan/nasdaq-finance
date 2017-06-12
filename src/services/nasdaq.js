import _ from 'lodash';
import request from 'request-promise';
import Promise from 'bluebird';
import cheerio from 'cheerio';
import bunyan from 'bunyan';

export default class Nasdaq {
  constructor(config, logger) {
    this.config = _.defaults(config, {
      requestConcurrency: 4,
      requestDelay: 0
    });

    this.logger = logger || bunyan.createLogger({ name: 'Nasdaq' });
    this.request = request;
  }

  _getPageId(section, page = 0) {
    return section * 100000 + page;
  }

  _getDataUrl(ticker) {
    return `http://www.nasdaq.com/g00/symbol/${ticker}/time-sales`;
  }

  _getTickerPage(ticker, postfix = '') {
    const uri = this._getDataUrl(ticker) + postfix;
    return this.request({
      uri,
      transform: body => cheerio.load(body)
    });
  }

  /**
   * Load price from a cheerio object
   * @param $ Cheerio object
   * @returns {null|number}
   * @private
   */
  _parsePrice($) {
    return Number(
      $('#qwidget_lastsale').text().replace('$', '')
    );
  }

  /**
   * Load info about given ticker
   * @param ticker Ticker eg tsla
   * @returns {Promise} Resolves into an object with ticker info
   */
  getInfo(ticker) {
    return this._getTickerPage(ticker)
      .then($ => ({
        name: $('.greenCompanyName').text(),
        exchange: $('#qbar_exchangeLabel').text().replace('Exchange:', ''),
        industry: $('#qbar_sectorLabel a').text(),
        image: $('#logo-wrap img').attr('x-defer-src'),
        price: this._parsePrice($),
        priceChange: $('#qwidget_netchange').text(),
        priceChangePercent: $('#qwidget_percent').text().replace('%', ''),
      }));
  }

  /**
   * Load price for a given ticker
   * @param ticker
   * @returns {Promise.<TResult>}
   */
  getPrice(ticker) {
    return this._getTickerPage(ticker)
      .then($ => this._parsePrice($));
  }

  _parseTicks($) {
    const rows = $('#AfterHoursPagingContents_Table tr');
    const ticks = [];

    rows.each((index, row) => {
      if (!index) return; // skip header row

      const cells = cheerio(row);
      const tick = {
        time: _.trim(cells.find('td:nth-child(1)').text()),
        price: Number(_.trim(
          cells.find('td:nth-child(2)').text().replace('$', '')
        )),
        volume: Number(cells.find('td:nth-child(3)').text())
      };
      ticks.push(tick);
    });

    return ticks;
  }

  _getLastPageNumber($) {
    const href = $('#quotes_content_left_lb_LastPage')
      .attr('href');
    const res = (href || '').match(/pageno=([1-9]+)/);
    return res && res.length >= 2 ? Number(res[1]) : null;
  }

  _loadPageTicks(scheduler, ticker, sectionNumber, pageNumber) {
    const postfix = `?time=${sectionNumber}&pageno=${pageNumber}`;
    const pageId = this._getPageId(sectionNumber, pageNumber);

    if (scheduler.lastValidPageId < pageId)
      return Promise.resolve([]);

    this.logger.debug(
      'Downloading %s - section %d - page %d',
      ticker,
      sectionNumber,
      pageNumber
    );
    return Promise.resolve(this._getTickerPage(ticker, postfix))
      .delay(this.config.requestDelay)
      .then($ => this._parseTicks($))
      .then((ticks) => {
        if (ticks.length === 0)
          scheduler.lastValidPageId = pageId;
        return ticks.reverse();
      });
  }

  _loadSection(scheduler, ticker, sectionNumber) {
    const ticks = [];
    const pageId = this._getPageId(sectionNumber);

    if (scheduler.lastValidPageId < pageId)
      return Promise.resolve([]);

    // fetch first page
    return this._getTickerPage(ticker, `?time=${sectionNumber}`)
      .then(($) => {
        const lastPage = this._getLastPageNumber($);
        const range = _.range(2, lastPage + 1);
        ticks.push(this._parseTicks($));

        if (ticks[0].length === 0) {
          scheduler.lastValidPageId = pageId;
          return Promise.resolve([]);
        }

        return Promise.map(range, pageNumber =>
          this._loadPageTicks(scheduler, ticker, sectionNumber, pageNumber)
        , { concurrency: this.config.requestConcurrency })
          .then(
            data => ticks.push(...data) && _.flatten(ticks.reverse())
          );
      });
  }

  getTicks(ticker) {
    const range = _.range(1, 14);
    const scheduler = {
      lastValidPageId: Number.MAX_VALUE
    };

    return Promise.map(
      range,
      section => this._loadSection(scheduler, ticker, section),
      { concurrency: 1 }
    )
      .then(ticks => _.flatten(ticks));
  }
}
