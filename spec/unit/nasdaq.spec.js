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
});
