'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _nasdaq = require('./services/nasdaq');

var _nasdaq2 = _interopRequireDefault(_nasdaq);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NasdaqFinance = function () {
  function NasdaqFinance(config) {
    (0, _classCallCheck3.default)(this, NasdaqFinance);

    this.config = _lodash2.default.defaults({}, config, NasdaqFinance._getDefaultConfig());
    this.api = new _nasdaq2.default(_lodash2.default.pick(config, ['requestConcurrency', 'requestDelay']));
  }

  /**
   * Will return a default configuration
   * @returns {{logLevel: string, concurrency: number}}
   * @private
   */


  (0, _createClass3.default)(NasdaqFinance, [{
    key: '_doMultipleCalls',


    /**
     * Will call a given function for all tickers with some concurrency
     * @param tickers Array of all tickers
     * @param cb Function to call for every ticker
     * @returns {Array|Promise}
     * @private
     */
    value: function _doMultipleCalls(tickers, cb) {
      var objectize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var concurrency = arguments[3];

      return _bluebird2.default.map(NasdaqFinance._toArray(tickers), cb.bind(this.api), { concurrency: concurrency || this.config.tickerConcurrency }).then(function (res) {
        return NasdaqFinance._serializeResult(res, tickers, objectize);
      });
    }

    /**
     * Will cast first argument to an array if it is not already
     * @param tickers One or multiple tickers
     * @returns {[array]} Array of all tickers
     * @private
     */

  }, {
    key: 'getInfo',


    /**
     * Load info about given tickers
     * @param ticker Ticker list or a single ticker
     * @param objectize Whether to return an object indexed by tickers
     * @returns {Array|Promise}
     */
    value: function getInfo(ticker, objectize) {
      return this._doMultipleCalls(ticker, this.api.getInfo, objectize);
    }

    /**
     * Load actual prices about given tickers
     * @param ticker Ticker list or a single ticker
     * @param objectize Whether to return an object indexed by tickers
     * @returns {Array|Promise}
     */

  }, {
    key: 'getPrice',
    value: function getPrice(ticker, objectize) {
      return this._doMultipleCalls(ticker, this.api.getPrice, objectize);
    }

    /**
     * Load tick data for given tickers
     * @param ticker Ticker list or a single ticker
     * @param objectize Whether to return an object indexed by tickers
     * @returns {Array|Promise}
     */

  }, {
    key: 'getTicks',
    value: function getTicks(ticker, objectize) {
      return this._doMultipleCalls(ticker, this.api.getTicks, objectize, 1);
    }
  }], [{
    key: '_getDefaultConfig',
    value: function _getDefaultConfig() {
      return {
        logLevel: 'info',
        tickerConcurrency: 4,
        requestConcurrency: 4,
        requestDelay: 50
      };
    }
  }, {
    key: '_toArray',
    value: function _toArray(tickers) {
      return _lodash2.default.isArray(tickers) ? tickers : [tickers];
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

  }, {
    key: '_serializeResult',
    value: function _serializeResult(res, tickers, objectize) {
      if (_lodash2.default.isArray(tickers)) return objectize ? _lodash2.default.zipObject(tickers, res) : res;

      // input was just one ticker - return a single value
      return res[0];
    }
  }]);
  return NasdaqFinance;
}();

exports.default = NasdaqFinance;