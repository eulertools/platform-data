import {handler} from '../src//app-eth-event-extractor/eth-token-transfers-handler'

describe('Collector token transfer', () => {

  let event: any;
  let context: any;

  beforeAll(() => {
    jest.setTimeout(250000);
    event = {}

    context = {}
  });

  it('execute', async (done) => {
    try {
      await handler(event, context);
      done();
    } catch (e) {
      done.fail(e)
    }
  });
});

