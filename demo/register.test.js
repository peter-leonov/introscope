import { effectsLogger, KEEP, MOCK } from 'introscope/logger';
import { combinate } from './combinate';
import { introscope } from './register';

const logger = effectsLogger(introscope);

// TODO: add an existing email in two steps
// add a duplicate of a normal email and press U
// change the code and see the diff
const useCases = {
    email: [['empty', ''], ['wrong', 'bla.com'], ['normal', 'foo@bar.com']],
    password: [['empty', ''], ['short', '123'], ['normal', '123456']],
    terms: [['unaccepted', false], ['accepted', true]],
};

describe('register', () => {
    combinate(useCases, (combinationName, cobination) => {
        it(combinationName, async () => {
            const { scope, effects } = logger({
                post: () => {},
                trackEvent: () => {},
                showLoadingSpinner: () => {},
                hideLoadingSpinner: () => {},
                showErrorMessage: () => {},
            });

            await scope.register(cobination);

            // verify the key side effects
            expect(effects()).toMatchSnapshot();
        });
    });
});
