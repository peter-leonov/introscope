// abusing Dependency Injection to make side effects explicit
function incrementComments(fetch, log, save, postId) {
    const post = fetch(`/posts/${postId}`);
    if (!post) return;
    log('comment.inc', postId);
    post.comments++;
    save(post);
}

const { plan } = require('./plan');
describe('incrementComments', () => {
    it('increments existing posts', () => {
        const p = plan();
        incrementComments(
            p.fetch(() => ({
                comments: 1
            })),
            p.log(),
            p.save(),
            123
        );
        expect(p()).toMatchSnapshot();
    });

    it('ignores non existing posts', () => {
        const p = plan();
        incrementComments(p.fetch(() => null), p.log(), p.save(), 123);
        expect(p()).toMatchSnapshot();
    });
});
