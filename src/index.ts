import { Maybe } from 'simple-maybe';
import { Future } from 'fluture';
import { Pass, Fail, IOU } from 'inquiry-monad';

const buildInqF = <T>(x: T) => (vals: Array<any>) =>
    vals.reduce((acc, cur) => cur.answer(x, 'reduced', InquiryF), x);

const InquiryFSubject = <T>(x: T | InquiryMonad) =>
    'isInquiry' in (x as T)
        ? x
        : InquiryF({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: <T>(_: T) => _
          });

const InquiryFOf = (x: Inquiry) => InquiryF(x);

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
    map: (f: Function): Inquiry => InquiryFSubject(f(x)), // cast required for now
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

    // Unwrapping methods: all return Futures, all complete outstanding IOUs

    // Unwraps the Inquiry after ensuring all IOUs are completed
    conclude: (f: Function, g: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map((i: any) => (i.isInquiry ? i.join() : i))
            .fork(console.error, (y: Inquiry) => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant
            })),

    // If no fails, handoff aggregated passes to supplied function; if fails, return existing InquiryF
    cleared: (f: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map(<T>(i: T | InquiryMonad) => ('isInquiry' in (i as T) ? (i as InquiryMonad).join() : i))
            .fork(
                console.error,
                (y: Inquiry) => (y.fail.isEmpty() ? f(y.pass) : InquiryF(y))
            ),

    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryF
    faulted: (f: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map(<T>(i: T | InquiryMonad) => ('isInquiry' in (i as T) ? (i as InquiryMonad).join() : i))
            .fork(
                console.error,
                (y: Inquiry) => (y.fail.isEmpty() ? InquiryF(y) : f(y.fail))
            ),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fork: (f: Function, g: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map(<T>(i: T | InquiryMonad) => ('isInquiry' in (i as T) ? (i as InquiryMonad).join() : i))
            .chain((y: Inquiry) => (y.fail.join().length ? f(y.fail) : g(y.pass))),

    // return a Future containing a merged fail/pass resultset array
    zip: (f: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map(<T>(i: T | InquiryMonad) => ('isInquiry' in (i as T) ? (i as InquiryMonad).join() : i))
            .chain((y: Inquiry) => f(y.fail.join().concat(y.pass.join()))),

    // await all IOUs to resolve, then return a new Inquiry
    await: (): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map(<T>(i: T | InquiryMonad) => ('isInquiry' in (i as T) ? (i as InquiryMonad).join() : i))
            .chain((y: Inquiry) => InquiryFOf(y)),

    isInquiry: true
});

const exportInquiryF = {
    subject: InquiryFSubject,
    of: InquiryFOf
};

export { exportInquiryF as InquiryF, Pass, Fail, IOU, Future };
