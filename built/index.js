"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const simple_maybe_1 = require("simple-maybe");
const fluture_1 = require("fluture");
const inquiry_monad_1 = require("inquiry-monad");
const buildInqF = (x) => (vals) => vals.reduce((acc, cur) => cur.answer(x, 'reduced', InquiryF), x);
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
    map: (f) => InquiryF.subject(f(x)),
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
    // Unwrapping methods: all return Promises, all complete outstanding IOUs
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
    cleared: (f) => __awaiter(this, void 0, void 0, function* () {
        return Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : InquiryF(y)))
            .catch(err => console.error('err', err));
    }),
    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryF
    faulted: (f) => __awaiter(this, void 0, void 0, function* () {
        return fluture_1.Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map((i) => (i.isInquiry ? i.join() : i))
            .fork(console.error, (y) => (y.fail.isEmpty() ? InquiryF(y) : f(y.fail)));
    }),
    // Take left function and hands off fails if any, otherwise takes left function and hands off passes to that function
    fork: (f, g) => __awaiter(this, void 0, void 0, function* () {
        return Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.join().length ? f(y.fail) : g(y.pass)));
    }),
    // return a Promise containing a merged fail/pass resultset array
    zip: (f) => __awaiter(this, void 0, void 0, function* () {
        return Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => f(y.fail.join().concat(y.pass.join())));
    }),
    // await all IOUs to resolve, then return a new Inquiry
    // @todo: awaitP, awaitF that return an InquiryP or InquiryF
    await: () => __awaiter(this, void 0, void 0, function* () {
        return Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => Inquiry(y));
    }),
    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});
const exportInquiryF = {
    subject: (x) => x.isInquiry
        ? x
        : InquiryF({
            subject: simple_maybe_1.Maybe.of(x),
            fail: inquiry_monad_1.Fail([]),
            pass: inquiry_monad_1.Pass([]),
            iou: inquiry_monad_1.IOU([]),
            informant: (_) => _
        }),
    of: (x) => InquiryF(x)
};
exports.InquiryF = exportInquiryF;
