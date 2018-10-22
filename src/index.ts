import { Maybe } from 'simple-maybe';
import { Future, FutureInstance, done, FutureTypeRep } from 'fluture';
import { Pass, Fail, IOU, Questionset, Question, Receipt } from 'inquiry-monad';

import {
    Monad,
    InquiryMonad,
    IOUMonad,
    PassFailMonad,
    PassMonad,
    FailMonad,
    InquiryValue,
    ReceiptMonad,
    ReceiptValue,
    QuestionsetMonad,
    QuestionMonad,
    QuestionValue
} from 'inquiry-monad/built/inquiry-monad';

import {
    $$inquirySymbol,
    $$questionsetSymbol,
    $$questionSymbol,
    $$passSymbol,
    $$failSymbol,
    $$iouSymbol,
    $$receiptSymbol
} from 'inquiry-monad/built/symbols';

const noop = (): void => {};

const buildInqF = (x: InquiryValue) => (vals: Array<any>) =>
    vals.reduce(
        (acc, cur) => cur[1].answer(acc.join(), '(async fn)', InquiryF),
        InquiryF(x)
    );

// this is a bit complex, so here it goes:
// Take all our IOUs (Questions), extract and resolve their Futures
// then take those results apply to a tuple with the question name/description and result
const resolveQs = (x: InquiryValue): FutureInstance<any, any> =>
    x.iou.join().length
        ? Future((reject, resolve) => {
              const results: Array<Array<PassMonad | FailMonad | string>> = [];
              x.iou.join().map(
                  (q: QuestionMonad): any => {
                      q.extract()().fork(reject, (result: any) => {
                          results.push([q.name(), result]);
                          results.length === x.iou.join().length &&
                              resolve(results);
                      });
                  }
              );
          })
        : Future.of([]);

const InquiryFSubject = (x: any | InquiryMonad): InquiryMonad =>
    x[$$inquirySymbol]
        ? x
        : InquiryF({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: <T>(_: T) => _,
              questionset: Questionset.of([['', noop]]),
              receipt: Receipt([])
          });

const warnTypeErrorF = <T>(x: T) => {
    console.warn(
        'InquiryF.of requires properties: subject, fail, pass, iou, informant, questionset, receipt. Converting to InquiryF.subject().'
    );
    return InquiryFSubject(x);
};

const InquiryFOf = (x: InquiryValue) =>
    'subject' in x &&
    'fail' in x &&
    'pass' in x &&
    'iou' in x &&
    'informant' in x &&
    'questionset' in x &&
    'receipt' in x
        ? InquiryF(x)
        : warnTypeErrorF(x);

const InquiryF = (x: InquiryValue): InquiryMonad => ({
    // Inquire: core method

    inquire: (f: Function | string | QuestionMonad) => {
        const extractName = (f: string | QuestionMonad) =>
            (f as QuestionMonad)[$$questionSymbol]
                ? (f as QuestionMonad).name()
                : f;
        const fnName =
            typeof f === 'function' ? f.name || 'anon' : extractName(f);
        const fExtractFn = (f as any)[$$questionSymbol]
            ? (f as QuestionMonad).extract()
            : f;
        const fIsFn = typeof fExtractFn === 'function';
        const inquire = fIsFn
            ? fExtractFn
            : (x.questionset as QuestionsetMonad).find(fExtractFn);

        const inquireResponse =
            typeof inquire === 'function' ? inquire(x.subject.join()) : {};

        const warnNotPassFail = (resp: any): InquiryMonad => {
            console.warn(
                'inquire was passed a function that does not return Pass or Fail:',
                fnName
            );
            return InquiryF(x);
        };

        const syncronousResult = (response: any): InquiryMonad =>
            response[$$failSymbol] ||
            response[$$passSymbol] ||
            response[$$inquirySymbol]
                ? response.answer(x, fnName, InquiryF)
                : warnNotPassFail([inquireResponse, fnName]);

        const inquireIOU =
            inquireResponse instanceof Future
                ? Question.of([fnName as string, () => inquireResponse])
                : false;

        return inquireIOU
            ? InquiryF({
                  subject: x.subject,
                  fail: x.fail,
                  pass: x.pass,
                  iou: x.iou.concat(IOU([inquireIOU])),
                  informant: x.informant,
                  questionset: x.questionset,
                  receipt: x.receipt
              })
            : syncronousResult(inquireResponse);
    },

    inquireMap: (
        f: Function | string | QuestionMonad,
        i: Array<any>
    ): InquiryMonad =>
        i.reduce(
            (inq, ii) => {
                const extractName = (f: string | QuestionMonad) =>
                    (f as QuestionMonad)[$$questionSymbol]
                        ? (f as QuestionMonad).name()
                        : f;
                const fnName =
                    typeof f === 'function' ? f.name || 'anon' : extractName(f);
                const fExtractFn = (f as any)[$$questionSymbol]
                    ? (f as QuestionMonad).extract()
                    : f;
                const fIsFn = typeof fExtractFn === 'function';
                const inquire = fIsFn
                    ? fExtractFn
                    : (x.questionset as QuestionsetMonad).find(fExtractFn);

                const warnNotPassFail = (resp: any) => {
                    console.warn(
                        'inquire was passed a function that does not return Pass or Fail:',
                        fnName
                    );
                    return inq;
                };
                const inquireResponse =
                    typeof inquire === 'function'
                        ? inquire(ii)(inq.join().subject.join())
                        : {};

                const syncronousResult = (response: any): InquiryMonad =>
                    response[$$failSymbol] ||
                    response[$$passSymbol] ||
                    response[$$inquirySymbol]
                        ? response.answer(inq.join(), fnName, InquiryF)
                        : Pass(response).answer(x, fnName, InquiryF); // @todo this should be warNotPassFail

                return inquireResponse instanceof Future
                    ? InquiryF({
                          subject: inq.join().subject,
                          fail: inq.join().fail,
                          pass: inq.join().pass,
                          iou: inq.join().iou.concat(IOU([inquireResponse])),
                          informant: inq.join().informant,
                          questionset: inq.join().questionset,
                          receipt: inq.join().receipt
                      })
                    : syncronousResult(inquireResponse);
            },

            // initial Inquiry will be what is in `x` now
            InquiryF({
                subject: x.subject,
                iou: x.iou,
                fail: x.fail,
                pass: x.pass,
                informant: x.informant,
                questionset: x.questionset,
                receipt: x.receipt
            })
        ),

    inquireAll: (): InquiryMonad =>
        (x.questionset as QuestionsetMonad).chain(
            (questions: Array<QuestionValue>): InquiryMonad =>
                questions.reduce(
                    (inq: InquiryMonad, q: QuestionValue): InquiryMonad =>
                        inq.inquire(Question.of(q)),
                    InquiryF(x)
                )
        ),

    using: (a: QuestionsetMonad): InquiryMonad =>
        InquiryF({
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: x.informant,
            questionset: a,
            receipt: x.receipt
        }),

    // Informant: for spying/logging/observable
    informant: (f: Function) =>
        InquiryF({
            // @todo accept array of functions instead, or have a plural version
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f,
            questionset: x.questionset,
            receipt: x.receipt
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
            informant: x.informant,
            questionset: x.questionset,
            receipt: x.receipt
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
            informant: x.informant,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    // Standard monad methods - note that while these work, remember that `x` is a typed Object
    map: (f: Function): InquiryMonad => InquiryFSubject(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): InquiryValue => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : InquiryF(x)),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) => (x.pass.join().length ? f(x) : InquiryF(x)),

    // internal method: execute informant, return new InquiryF() based on updated results
    answer: (i: InquiryValue, n: string, _: Function): InquiryMonad => {
        i.informant([n, InquiryF(x)]);
        return InquiryF({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant,
            questionset: i.questionset,
            receipt: i.receipt
        });
    },

    // Unwrapping methods: all complete outstanding IOUs

    // Unwraps the Inquiry after ensuring all IOUs are completed
    // this DOES NOT FORK
    // callee MUST fork to retrieve supplied value
    conclude: (f: Function, g: Function): FutureInstance<any, any> =>
        Future((reject, resolve) =>
            resolveQs(x)
                .map(buildInqF(x))
                .map((i: any) => (i[$$inquirySymbol] ? i.join() : i))
                .fork(reject, (y: InquiryValue) =>
                    resolve({
                        subject: y.subject,
                        iou: y.iou,
                        fail: f(y.fail),
                        pass: g(y.pass),
                        informant: y.informant,
                        questionset: y.questionset,
                        receipt: y.receipt
                    })
                )
        ),

    // If no fails, handoff aggregated passes to supplied function; if fails, return existing InquiryF
    cleared: (f: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(
                    console.error,
                    (y: InquiryValue) =>
                        y.fail.isEmpty() ? f(y.pass) : InquiryF(y)
                )
        ),

    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryF
    faulted: (f: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(
                    console.error,
                    (y: InquiryValue) =>
                        y.fail.isEmpty() ? InquiryF(y) : f(y.fail)
                )
        ),

    // If any passes, handoff aggregated passes to supplied function; if no passes, return existing InquiryF
    suffice: (f: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(
                    console.error,
                    (y: InquiryValue) =>
                        y.pass.isEmpty() ? InquiryF(y) : f(y.pass)
                )
        ),

    // If no passes, handoff aggregated fails to supplied function; if any passes, return existing InquiryF
    scratch: (f: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(
                    console.error,
                    (y: InquiryValue) =>
                        y.pass.isEmpty() ? f(y.fail) : InquiryF(y)
                )
        ),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fork: (f: Function, g: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(
                    console.error,
                    (y: InquiryValue) =>
                        y.fail.join().length ? f(y.fail) : g(y.pass)
                )
        ),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fold: (f: Function, g: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(
                    console.error,
                    (y: InquiryValue) =>
                        y.pass.join().length ? f(y.pass) : g(y.fail)
                )
        ),

    // return a Future containing a merged fail/pass resultset array
    zip: (f: Function): FutureInstance<any, any> =>
        Future.of(
            resolveQs(x)
                .map(buildInqF(x))
                .map(
                    <T>(i: T | InquiryMonad) =>
                        $$inquirySymbol in (i as T)
                            ? (i as InquiryMonad).join()
                            : i
                )
                .fork(console.error, (y: InquiryValue) =>
                    f(y.fail.join().concat(y.pass.join()))
                )
        ),

    // resolves all IOUs, returns a Promise
    // @ts-ignore @todo add .promise as optional part of an Inquiry
    promise: (): Future<any, any> =>
        resolveQs(x)
            .map(buildInqF(x))
            .promise(),

    // @ts-ignore
    [$$inquirySymbol]: true
});

const exportInquiryF = {
    subject: InquiryFSubject,
    of: InquiryFOf
};

export {
    exportInquiryF as InquiryF,
    Pass,
    Fail,
    IOU,
    Future,
    $$inquirySymbol,
    Questionset,
    Question,
    Receipt
};
