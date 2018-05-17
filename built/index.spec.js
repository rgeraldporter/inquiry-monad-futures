"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const inquiry_monad_1 = require("inquiry-monad");
require("jasmine");
const simple_maybe_1 = require("simple-maybe");
const fluture_1 = __importDefault(require("fluture"));
const oldEnough = (a) => a.age > 13 ? inquiry_monad_1.Pass(['old enough']) : inquiry_monad_1.Fail(['not old enough']);
const findHeight = () => inquiry_monad_1.Pass([{ height: 110, in: 'cm' }]);
const nameSpelledRight = (a) => a.name === 'Ron'
    ? inquiry_monad_1.Pass('Spelled correctly')
    : inquiry_monad_1.Fail(["Name wasn't spelled correctly"]);
const hasRecords = () => inquiry_monad_1.Pass([{ records: [1, 2, 3] }]);
const mathGrade = () => inquiry_monad_1.Fail(['Failed at math']);
const resolveAfter1SecondF = (x) => fluture_1.default.after(1000, inquiry_monad_1.Pass('passed'));
const resolveAfter2SecondsF = (x) => fluture_1.default.after(2000, inquiry_monad_1.Fail('delayed fail'));
describe('The module', () => {
    it('should satisfy the first monad law of left identity', () => {
        // this is trickier to do with a typed monad, but not impossible
        // we cannot just do some simple math as the value much adhere to type Inquiry
        // but the law seems to be provable with objects as much as they are with numbers
        const a = {
            subject: simple_maybe_1.Maybe.of(1),
            fail: inquiry_monad_1.Fail([]),
            pass: inquiry_monad_1.Pass([]),
            iou: inquiry_monad_1.IOU([]),
            informant: (_) => _
        };
        const f = (n) => index_1.InquiryF.of(Object.assign(n, {
            subject: n.subject.map((x) => x + 1)
        }));
        // 1. unit(x).chain(f) ==== f(x)
        const leftIdentity1 = index_1.InquiryF.of(a).chain(f);
        const leftIdentity2 = f(a);
        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());
        const g = (n) => index_1.InquiryF.of(Object.assign(n, {
            subject: n.subject.map((x) => ({
                value: x * 10,
                string: `Something with the number ${x}`
            }))
        }));
        // 1. Inquiry.of(x).chain(f) ==== f(x)
        const leftIdentity3 = index_1.InquiryF.of(a).chain(g);
        const leftIdentity4 = g(a);
        expect(leftIdentity3.join()).toEqual(leftIdentity4.join());
    });
    it('should satisfy the second monad law of right identity', () => {
        const a = {
            subject: simple_maybe_1.Maybe.of(3),
            fail: inquiry_monad_1.Fail([]),
            pass: inquiry_monad_1.Pass([]),
            iou: inquiry_monad_1.IOU([]),
            informant: (_) => _
        };
        const rightIdentity1 = index_1.InquiryF.of(a).chain(index_1.InquiryF.of);
        const rightIdentity2 = index_1.InquiryF.of(a);
        // 2. m.chain(unit) ==== m
        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });
    it('should satisfy the third monad law of associativity', () => {
        const a = {
            subject: simple_maybe_1.Maybe.of(30),
            fail: inquiry_monad_1.Fail([]),
            pass: inquiry_monad_1.Pass([]),
            iou: inquiry_monad_1.IOU([]),
            informant: (_) => _
        };
        const g = (n) => index_1.InquiryF.of(Object.assign(n, {
            subject: n.subject.map((x) => ({
                value: x * 10,
                string: `Something with the number ${x}`
            }))
        }));
        const f = (n) => index_1.InquiryF.of(Object.assign(n, {
            subject: n.subject.map((x) => x + 1)
        }));
        // 3. m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))
        const associativity1 = index_1.InquiryF.of(a)
            .chain(g)
            .chain(f);
        const associativity2 = index_1.InquiryF.of(a).chain((x) => g(x).chain(f));
        expect(associativity1.join()).toEqual(associativity2.join());
    });
    it('should be able to make many checks, including async ones, and run a faulted unwrap', (done) => {
        return index_1.InquiryF
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter2SecondsF)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted((x) => {
            expect(x.inspect()).toBe("Fail(not old enough,Name wasn't spelled correctly,Failed at math,delayed fail)");
            done();
        });
        //console.log('x', x);
    });
    // due to old prototype method
    it('should not have prototype pollution', () => {
        expect(inquiry_monad_1.InquiryP.subject === index_1.InquiryF.subject).toBe(false);
    });
});
