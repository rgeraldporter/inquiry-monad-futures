"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const inquiry_monad_1 = require("inquiry-monad");
require("jasmine");
const fluture_1 = __importDefault(require("fluture"));
const oldEnough = (a) => a.age > 13 ? inquiry_monad_1.Pass(['old enough']) : inquiry_monad_1.Fail(['not old enough']);
const findHeight = () => inquiry_monad_1.Pass([{ height: 110, in: 'cm' }]);
const nameSpelledRight = (a) => a.name === 'Ron'
    ? inquiry_monad_1.Pass('Spelled correctly')
    : inquiry_monad_1.Fail(["Name wasn't spelled correctly"]);
const hasRecords = () => inquiry_monad_1.Pass([{ records: [1, 2, 3] }]);
const mathGrade = () => inquiry_monad_1.Fail(['Failed at math']);
function resolveAfter2Seconds(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(inquiry_monad_1.Pass('passed'));
        }, 2000);
    });
}
function resolveAfter1Second(x) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(inquiry_monad_1.Pass('passed'));
        }, 1000);
    });
}
const resolveAfter1SecondF = (x) => fluture_1.default.after(1000, inquiry_monad_1.Pass('passed'));
describe('The module', () => {
    it('should be able to make many checks, including async ones, and run a faulted unwrap', () => {
        return index_1.InquiryF
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1SecondF)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted((x) => {
            expect(x.inspect()).toBe("Fail(not old enough,Name wasn't spelled correctly,Failed at math)");
            return x;
        });
        //console.log('x', x);
    });
    // due to old prototype method
    it('should not have prototype pollution', () => {
        expect(inquiry_monad_1.InquiryP.subject === index_1.InquiryF.subject).toBe(false);
    });
});
