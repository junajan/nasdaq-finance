import _ from 'lodash';
import sinon from 'sinon';
import cheerio from 'cheerio';
import { expect } from 'chai';
import Nasdaq from '../../src/services/nasdaq';

describe('Nasdaq', () => {
  let nasdaq;

  beforeEach(() => {
    nasdaq = new Nasdaq();
  });

  it('should have default config', () => {
    expect(nasdaq.config).to.deep.equal({
      requestConcurrency: 4,
      requestDelay: 0
    });
  });

  it('should return an URL', () => {
    const url = nasdaq._getDataUrl('TSLA');

    expect(url).to.contain('TSLA');
    expect(url).to.contain('www.nasdaq.com');
  });

  it('should return a pageId', () => {
    const pageId = nasdaq._getPageId(1, 30);
    const pageId2 = nasdaq._getPageId(4, 30);
    const pageId3 = nasdaq._getPageId(32);

    expect(pageId).to.equal(100000 + 30);
    expect(pageId2).to.equal(4 * 100000 + 30);
    expect(pageId3).to.equal(32 * 100000);
    expect(pageId < pageId2).to.equal(true);
  });

  it('should parse a price from a HTML page', () => {
    const html = '<div id="qwidget_lastsale">$123.45</div>';
    expect(nasdaq._parsePrice(cheerio.load(html))).to.equal(123.45);
  });

  it('should parse last section page id', () => {
    const html = '<a id="quotes_content_left_lb_LastPage" href="url.tld?pageno=1234">link</a>';
    expect(nasdaq._getLastPageNumber(cheerio.load(html))).to.equal(1234);
  });

  it('should not parse missing last section page id', () => {
    const html = '<a id="invalid_id" href="url.tld?pageno=1234">link</a>';
    expect(nasdaq._getLastPageNumber(cheerio.load(html))).to.equal(null);
  });

  it('should request a ticker page', () => {
    const html = '<a>abc</a>';
    const stub = sinon
      .stub(nasdaq, 'request')
      .returns(Promise.resolve(html));

    return nasdaq._getTickerPage('tsla', '?a=b')
      .then((res) => {
        expect(res).to.equal(html);
        expect(stub.args[0][0].uri).to.equal(
          `${nasdaq._getDataUrl('tsla')}?a=b`
        );
      });
  });

  it('should parse ticks table', () => {
    const html = `
      <table id="AfterHoursPagingContents_Table">
        <tr><th>Time</th><th>Price</th><th>Volume</th></tr>
        <tr><td>1</td><td>123</td><td>10</td></tr>
        <tr><td>2</td><td>124</td><td>20</td></tr>
        <tr><td>3</td><td>125</td><td>30</td></tr>
      </table>
    `;
    const parsed = nasdaq._parseTicks(cheerio.load(html));

    expect(parsed).to.have.lengthOf(3);
    expect(parsed[0]).to.deep.equal({
      time: '1',
      price: 123,
      volume: 10
    });

    expect(parsed[1].time).to.equal('2');
    expect(parsed[2].time).to.equal('3');
  });

  it('should call _loadSection for all sections', () => {
    const stub = sinon
      .stub(nasdaq, '_loadSection')
      .returns(Promise.resolve([1, 2]));

    return nasdaq.getTicks('tsla')
      .then((res) => {
        expect(res).to.be.an('array');
        expect(res).to.have.lengthOf(13 * 2);

        expect(stub.args.length).to.equal(13);
        expect(stub.args[0][1]).to.equal('tsla');

        const sections = stub.args.map(sec => sec[2]);
        expect(sections.sort()).to.deep.equal(_.range(1, 14).sort());
      });
  });

  it('should process html result with tick data', () => {
    const html = `
      <table id="AfterHoursPagingContents_Table">
        <tr><th>Time</th><th>Price</th><th>Volume</th></tr>
        <tr><td>1</td><td>123</td><td>10</td></tr>
        <tr><td>2</td><td>124</td><td>20</td></tr>
        <tr><td>3</td><td>125</td><td>30</td></tr>
      </table>
    `;
    const stub = sinon
      .stub(nasdaq, '_getTickerPage')
      .returns(cheerio.load(html));

    return nasdaq._loadPageTicks({ lastValidPageId: 10000000 }, 'tsla', 1, 1)
      .then((res) => {
        expect(res).to.deep.equal([
          { time: '3', price: 125, volume: 30 },
          { time: '2', price: 124, volume: 20 },
          { time: '1', price: 123, volume: 10 }
        ]);
        expect(stub.args[0]).to.deep.equal(['tsla', '?time=1&pageno=1']);
      });
  });

  it('should not call URL when the page should be empty', () =>
    nasdaq._loadPageTicks({ lastValidPageId: 10 }, 'tsla', 1, 1)
      .then((res) => {
        expect(res).to.deep.equal([]);
      })
  );

  it('should update a manager when the page is empty', () => {
    const manager = { lastValidPageId: 10000000 };
    const html = `
      <table id="AfterHoursPagingContents_Table">
        <tr><th>Time</th><th>Price</th><th>Volume</th></tr>
      </table>
    `;
    const stub = sinon
      .stub(nasdaq, '_getTickerPage')
      .returns(cheerio.load(html));

    return nasdaq._loadPageTicks(manager, 'tsla', 1, 1)
      .then((res) => {
        expect(res).to.deep.equal([]);
        expect(stub.args[0]).to.deep.equal(['tsla', '?time=1&pageno=1']);
        expect(manager.lastValidPageId).to.equal(nasdaq._getPageId(1, 1));
      });
  });

  it('should read all ticks for a given section', () => {
    const manager = { lastValidPageId: 99999999 };
    const html = `
      <table id="AfterHoursPagingContents_Table">
        <tr><th>Time</th><th>Price</th><th>Volume</th></tr>
        <tr><td>1</td><td>123</td><td>10</td></tr>
        <tr><td>2</td><td>124</td><td>20</td></tr>
        <tr><td>3</td><td>125</td><td>30</td></tr>
      </table>
      <a id="quotes_content_left_lb_LastPage" href="url.ab?pageno=4">link</a>
    `;
    const stub = sinon.stub(nasdaq, '_getTickerPage')
      .returns(Promise.resolve(cheerio.load(html)));

    return nasdaq._loadSection(manager, 'tsla', 1)
      .then((res) => {
        expect(res).to.have.lengthOf(3 * 4);
        expect(stub.args).to.have.lengthOf(4);
        expect(stub.args).to.deep.equal([
          ['tsla', '?time=1'],
          ['tsla', '?time=1&pageno=2'],
          ['tsla', '?time=1&pageno=3'],
          ['tsla', '?time=1&pageno=4']
        ]);
      });
  });

  it('should not read section if it is marked as empty', () => {
    const manager = { lastValidPageId: 0 }; // last pageId with data
    const stub = sinon.stub(nasdaq, '_getTickerPage')
      .returns(Promise.resolve(cheerio.load('')));

    return nasdaq._loadSection(manager, 'tsla', 1)
      .then((res) => {
        expect(res).to.have.lengthOf(0);
        expect(stub.args).to.have.lengthOf(0);
      });
  });

  it('should mark a lastPage when it has no data', () => {
    const manager = { lastValidPageId: 9999999 }; // last pageId with data
    const stub = sinon.stub(nasdaq, '_getTickerPage')
      .returns(Promise.resolve(cheerio.load('')));

    return nasdaq._loadSection(manager, 'tsla', 1)
      .then((res) => {
        expect(res).to.have.lengthOf(0);
        expect(stub.args).to.have.lengthOf(1);
        expect(stub.args).to.deep.equal([
          ['tsla', '?time=1']
        ]);

        expect(manager.lastValidPageId).to.equal(nasdaq._getPageId(1));
      });
  });
});
