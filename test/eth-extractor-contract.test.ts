import { handler } from '../src/app-eth-blockchain-extractor/eth-extractor-contract'

describe('Extractor contract', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(150000);
    
    event = {
      Records:[
        {
          body: JSON.stringify({
            Message: JSON.stringify(   {
              "address": "0x2538eb3dbbc1c2d2a1263fc3d822114c2989a692"
           })
          })
        }
      ]
    }

    context = {};
  });

  it('execute and import contract in catalog', async (done) => {

    try {
      const result = await handler(event, context);
      console.log(JSON.parse(result.body))
      expect(result.statusCode).toBe(200);
      done();
    } catch (e) {
      done.fail(e)
    }
  });
});

