import _ from 'lodash';
import sinon from 'sinon';
import Promise from 'bluebird';
import { expect } from 'chai';
import NasdaqFinance from '../../src/index';
import Nasdaq from '../../src/services/nasdaq';

describe('NasdaqFinance', () => {
  let nasdaqFinance;

  beforeEach(() => {
    nasdaqFinance = new NasdaqFinance();
  });

  it('should have default config', () => {
    expect(nasdaqFinance.config).to.deep.equal(
      NasdaqFinance._getDefaultConfig()
    );
    expect(nasdaqFinance.api).to.be.instanceof(Nasdaq);
  });

  it('should cast single item to array', () => {
    expect(NasdaqFinance._toArray(123)).to.deep.equal([123]);
    expect(NasdaqFinance._toArray([1, 2])).to.deep.equal([1, 2]);
    expect(NasdaqFinance._toArray([1])).to.deep.equal([1]);
  });

  it('should serialize result based on args', () => {
    const resultArray = [{ info: 'ABCD' }];

    let res = NasdaqFinance._serializeResult(resultArray, 'ABC');
    expect(res).to.deep.equal({
      info: 'ABCD'
    });

    res = NasdaqFinance._serializeResult(resultArray, ['ABC']);
    expect(res).to.deep.equal([{
      info: 'ABCD'
    }]);

    res = NasdaqFinance._serializeResult(resultArray, ['ABC'], 1);
    expect(res).to.deep.equal({
      ABC: {
        info: 'ABCD'
      }
    });
  });

  it('should do multiple calls for given tickers', () => {
    const tickers = 'AAPL,TSLA,JNJ'.split(',');
    const stub = sinon.stub().returns(Promise.resolve(true));

    return nasdaqFinance._doMultipleCalls(tickers, stub)
      .then((res) => {
        expect(res).to.have.lengthOf(3);
        expect(stub.args.map(_.first)).to.deep.equal(tickers);
      });
  });

  it('should call multiple times processing functions', () => {
    const stubs = {};

    ['getInfo', 'getPrice', 'getTicks'].forEach((key) => {
      stubs[key] = sinon.stub(nasdaqFinance.api, key).returns(Promise.resolve());
    });

    return Promise.all([
      nasdaqFinance.getInfo([1, 2, 3]),
      nasdaqFinance.getPrice([1, 2]),
      nasdaqFinance.getTicks([1, 5])
    ])
      .then(() => {
        expect(
          stubs.getInfo.args.map(_.first)
        ).to.deep.equal([1, 2, 3]);

        expect(
          stubs.getPrice.args.map(_.first)
        ).to.deep.equal([1, 2]);

        expect(
          stubs.getTicks.args.map(_.first)
        ).to.deep.equal([1, 5]);
      });
  });
});
