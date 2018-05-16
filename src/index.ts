import { Maybe } from 'simple-maybe';
import { Future } from 'fluture';
import { Pass, Fail, IOU } from 'inquiry-monad';

const buildInqF = (x: any) => (vals: Array<any>) =>
    vals.reduce((acc, cur) => cur.answer(x, 'reduced', InquiryF), x);

const InquiryF = (x: Inquiry): InquiryMonad => ({
    // Inquire: core method
    inquire: (f: Function) => {
        const inquireResponse = f(x.subject.join());
        const syncronousResult = (response: any) =>
            response.isFail || response.isPass || response.isInquiry
                ? response.answer(x, f.name, InquiryF)
                : Pass(response);

        return inquireResponse instanceof Future
            ? InquiryF({
                  subject: x.subject,
                  fail: x.fail,
                  pass: x.pass,
                  iou: x.iou.concat(IOU([inquireResponse])),
                  informant: x.informant
              })
            : syncronousResult(inquireResponse);
    },

    // Informant: for spying/logging/observable
    informant: (f: Function) =>
        InquiryF({
            // @todo accept array of functions instead, or have a plural version
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f
        }),

    inspect: (): string =>
        `InquiryF(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swap left/right pass/fail (iou is untouched)
    swap: (): InquiryMonad =>
        InquiryF({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant
        }),

    // Mapping across both branches
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort), iou untouched
        InquiryF({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant
        }),

    // Standard monad methods - note that while these work, remember that `x` is a typed Object
    map: (f: Function): Inquiry => (InquiryF as any).subject(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): Inquiry => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : InquiryF(x)),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) => (x.pass.join().length ? f(x) : InquiryF(x)),

    // internal method: execute informant, return new InquiryF() based on updated results
    answer: (i: Inquiry, n: string, _: Function): InquiryMonad => {
        i.informant([n, InquiryF(x)]);
        return InquiryF({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // Unwrapping methods: all return Promises, all complete outstanding IOUs

    // Unwraps the Inquiry after ensuring all IOUs are completed
    conclude: (f: Function, g: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map((i: any) => (i.isInquiry ? i.join() : i))
            .fork(console.error, (y: any) => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant
            })),

    // If no fails, handoff aggregated passes to supplied function; if fails, return existing InquiryF
    cleared: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : InquiryF(y)))
            .catch(err => console.error('err', err)),

    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryF
    faulted: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map((i: any) => (i.isInquiry ? i.join() : i))
            .fork(
                console.error,
                (y: any) => (y.fail.isEmpty() ? InquiryF(y) : f(y.fail))
            ),

    // Take left function and hands off fails if any, otherwise takes left function and hands off passes to that function
    fork: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.join().length ? f(y.fail) : g(y.pass))),

    // return a Promise containing a merged fail/pass resultset array
    zip: async (f: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => f(y.fail.join().concat(y.pass.join()))),

    // await all IOUs to resolve, then return a new Inquiry
    // @todo: awaitP, awaitF that return an InquiryP or InquiryF
    await: async (): Promise<InquiryMonad> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => Inquiry(y)),

    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

const exportInquiryF = {
    subject: (x: any) =>
        x.isInquiry
            ? x
            : InquiryF({
                  subject: Maybe.of(x),
                  fail: Fail([]),
                  pass: Pass([]),
                  iou: IOU([]),
                  informant: (_: any) => _
              })
};

export { exportInquiryF as InquiryF };
