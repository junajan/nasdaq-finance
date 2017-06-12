import _ from 'lodash';
import Promise from 'bluebird';
import bunyan from 'bunyan';
import Nasdaq from './services/nasdaq';

export default class NasdaqFinance {
  constructor(config, logger) {
    this.config = _.defaults({}, config, NasdaqFinance._getDefaultConfig());
    this.logger = logger || bunyan.createLogger({
      name: 'Nasdaq',
      level: this.config.logLevel
    });

    this.api = new Nasdaq(_.pick(
      config, ['requestConcurrency', 'requestDelay']
    ), this.logger);
  }

  /**
   * Will return a default configuration
   * @returns {{logLevel: string, concurrency: number}}
   * @private
   */
  static _getDefaultConfig() {
    return {
      logLevel: 'info',
      tickerConcurrency: 4,
      requestConcurrency: 4,
      requestDelay: 50
    };
  }

  /**
   * Will call a given function for all tickers with some concurrency
   * @param tickers Array of all tickers
   * @param cb Function to call for every ticker
   * @returns {Array|Promise}
   * @private
   */
  _doMultipleCalls(tickers, cb, objectize = false, concurrency) {
    return Promise.map(
      NasdaqFinance._toArray(tickers),
      cb.bind(this.api),
      { concurrency: concurrency || this.config.tickerConcurrency }
    )
      .then(res => NasdaqFinance._serializeResult(res, tickers, objectize));
  }

  /**
   * Will cast first argument to an array if it is not already
   * @param tickers One or multiple tickers
   * @returns {[array]} Array of all tickers
   * @private
   */
  static _toArray(tickers) {
    return _.isArray(tickers)
      ? tickers
      : [tickers];
  }

  /**
   * Will take a result array and return
   *  - a single value in case that we requested just one ticker
   *  - an array with results for all tickers
   *  - an object with results indexed by tickers if we set objectize to true
   * @param res List of results for all tickers
   * @param tickers List of all tickers
   * @param objectize Whethere to objectize result
   * @returns {mixed}
   * @private
   */
  static _serializeResult(res, tickers, objectize) {
    if (_.isArray(tickers))
      return objectize
        ? _.zipObject(tickers, res)
        : res;

    // input was just one ticker - return a single value
    return res[0];
  }

  /**
   * Load info about given tickers
   * @param ticker Ticker list or a single ticker
   * @param objectize Whether to return an object indexed by tickers
   * @returns {Array|Promise}
   */
  getInfo(ticker, objectize) {
    return this._doMultipleCalls(ticker, this.api.getInfo, objectize);
  }

  /**
   * Load actual prices about given tickers
   * @param ticker Ticker list or a single ticker
   * @param objectize Whether to return an object indexed by tickers
   * @returns {Array|Promise}
   */
  getPrice(ticker, objectize) {
    return this._doMultipleCalls(ticker, this.api.getPrice, objectize);
  }

  /**
   * Load tick data for given tickers
   * @param ticker Ticker list or a single ticker
   * @param objectize Whether to return an object indexed by tickers
   * @returns {Array|Promise}
   */
  getTicks(ticker, objectize) {
    return this._doMultipleCalls(ticker, this.api.getTicks, objectize, 1);
  }
}
