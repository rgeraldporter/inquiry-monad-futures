"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const simple_maybe_1 = require("simple-maybe");
const fluture_1 = require("fluture");
const inquiry_monad_1 = require("inquiry-monad");
const buildInqF = (x) => (vals) => vals.reduce((acc, cur) => cur.answer(x, 'reduced', InquiryF), x);
const InquiryFSubject = (x) => 'isInquiry' in x
    ? x
    : InquiryF({
        subject: simple_maybe_1.Maybe.of(x),
        fail: inquiry_monad_1.Fail([]),
        pass: inquiry_monad_1.Pass([]),
        iou: inquiry_monad_1.IOU([]),
        informant: (_) => _
    });
const InquiryFOf = (x) => InquiryF(x);
const InquiryF = (x) => ({
    // Inquire: core method
    inquire: (f) => {
        const inquireResponse = f(x.subject.join());
        const syncronousResult = (response) => response.isFail || response.isPass || response.isInquiry
            ? response.answer(x, f.name, InquiryF)
            : inquiry_monad_1.Pass(response);
        return inquireResponse instanceof fluture_1.Future
            ? InquiryF({
                subject: x.subject,
                fail: x.fail,
                pass: x.pass,
                iou: x.iou.concat(inquiry_monad_1.IOU([inquireResponse])),
                informant: x.informant
            })
            : syncronousResult(inquireResponse);
    },
    // Informant: for spying/logging/observable
    informant: (f) => InquiryF({
        // @todo accept array of functions instead, or have a plural version
        subject: x.subject,
        iou: x.iou,
        fail: x.fail,
        pass: x.pass,
        informant: f
    }),
    inspect: () => `InquiryF(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,
    // Flow control: swap left/right pass/fail (iou is untouched)
    swap: () => InquiryF({
        subject: x.subject,
        iou: x.iou,
        fail: inquiry_monad_1.Fail(x.pass.join()),
        pass: inquiry_monad_1.Pass(x.fail.join()),
        informant: x.informant
    }),
    // Mapping across both branches
    unison: (f) => // apply a single map to both fail & pass (e.g. sort), iou untouched
     InquiryF({
        subject: x.subject,
        iou: x.iou,
        fail: inquiry_monad_1.Fail(f(x.fail.join())),
        pass: inquiry_monad_1.Pass(f(x.pass.join())),
        informant: x.informant
    }),
    // Standard monad methods - note that while these work, remember that `x` is a typed Object
    map: (f) => InquiryFSubject(f(x)),
    ap: (y) => y.map(x),
    chain: (f) => f(x),
    join: () => x,
    // execute the provided function if there are failures, else continue
    breakpoint: (f) => (x.fail.join().length ? f(x) : InquiryF(x)),
    // execute the provided function if there are passes, else continue
    milestone: (f) => (x.pass.join().length ? f(x) : InquiryF(x)),
    // internal method: execute informant, return new InquiryF() based on updated results
    answer: (i, n, _) => {
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
    conclude: (f, g) => fluture_1.Future.parallel(Infinity, x.iou.join())
        .map(buildInqF(x))
        .map((i) => (i.isInquiry ? i.join() : i))
        .fork(console.error, (y) => ({
        subject: y.subject,
        iou: y.iou,
        fail: f(y.fail),
        pass: g(y.pass),
        informant: y.informant
    })),
    // If no fails, handoff aggregated passes to supplied function; if fails, return existing InquiryF
    cleared: (f) => fluture_1.Future.parallel(Infinity, x.iou.join())
        .map(buildInqF(x))
        .map((i) => ('isInquiry' in i ? i.join() : i))
        .fork(console.error, (y) => (y.fail.isEmpty() ? f(y.pass) : InquiryF(y))),
    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryF
    faulted: (f) => fluture_1.Future.parallel(Infinity, x.iou.join())
        .map(buildInqF(x))
        .map((i) => ('isInquiry' in i ? i.join() : i))
        .fork(console.error, (y) => (y.fail.isEmpty() ? InquiryF(y) : f(y.fail))),
    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fork: (f, g) => fluture_1.Future.parallel(Infinity, x.iou.join())
        .map(buildInqF(x))
        .map((i) => ('isInquiry' in i ? i.join() : i))
        .chain((y) => (y.fail.join().length ? f(y.fail) : g(y.pass))),
    // return a Future containing a merged fail/pass resultset array
    zip: (f) => fluture_1.Future.parallel(Infinity, x.iou.join())
        .map(buildInqF(x))
        .map((i) => ('isInquiry' in i ? i.join() : i))
        .chain((y) => f(y.fail.join().concat(y.pass.join()))),
    // await all IOUs to resolve, then return a new Inquiry
    await: () => fluture_1.Future.parallel(Infinity, x.iou.join())
        .map(buildInqF(x))
        .map((i) => ('isInquiry' in i ? i.join() : i))
        .chain((y) => InquiryFOf(y)),
    isInquiry: true
});
const exportInquiryF = {
    subject: InquiryFSubject,
    of: InquiryFOf
};
exports.InquiryF = exportInquiryF;
