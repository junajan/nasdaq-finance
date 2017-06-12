import { expect } from 'chai';
import Nasdaq from '../../src/services/nasdaq';

describe('Nasdaq', () => {
  let nasdaq;

  beforeEach(() => {
    nasdaq = new Nasdaq();
  });

  it('should get stock info', () =>
    nasdaq.getInfo('TSLA')
      .then((res) => {
        expect(res.name).to.contain('Tesla');
        expect(res.industry).to.equal('Capital Goods');
        expect(res.exchange).to.equal('NASDAQ');
        expect(res).to.have.property('price');
        expect(res).to.have.property('priceChange');
        expect(res).to.have.property('priceChangePercent');
      })
  );

  it('should get stock price', () =>
    nasdaq.getPrice('TSLA')
      .then((res) => {
        expect(res).to.be.a('number');
        expect(res).to.be.above(0);
      })
  );
});
