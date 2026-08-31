import {handler} from '../src/app-eth-event-extractor/evm-bridge-token-events-collector'

describe('Collector token transfer', () => {

  let event: any;
  let context: any;

  beforeAll(() => {
    jest.setTimeout(250000);
    event = {
      Records: [
        {
          body: JSON.stringify({
            Message: JSON.stringify({number: '22491127', timestamp: '1662130188'})
          })
        }
      ]
    }
    context = {}
  });

  it('execute', async (done) => {
    try {
      require('dotenv').config();
      await handler(event, context);
      done();
    } catch (e) {
      done.fail(e)
    }
  });
});
