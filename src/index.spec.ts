import { InquiryF } from './index';
import { Pass, Fail, IOU, InquiryP } from 'inquiry-monad';
import * as R from 'ramda';
import 'jasmine';
import { Maybe } from 'simple-maybe';
import Future from 'fluture';

const oldEnough = (a: any) =>
    a.age > 13 ? Pass(['old enough']) : Fail(['not old enough']);

const findHeight = () => Pass([{ height: 110, in: 'cm' }]);
const nameSpelledRight = (a: any) =>
    a.name === 'Ron'
        ? Pass('Spelled correctly')
        : Fail(["Name wasn't spelled correctly"]);
const hasRecords = () => Pass([{ records: [1, 2, 3] }]);
const mathGrade = () => Fail(['Failed at math']);

function resolveAfter2Seconds(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed'));
        }, 2000);
    });
}

function resolveAfter1Second(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed'));
        }, 1000);
    });
}

const resolveAfter1SecondF = (x: any) => Future.after(1000, Pass('passed'));

describe('The module', () => {
    it('should be able to make many checks, including async ones, and run a faulted unwrap', () => {
        return (InquiryF as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1SecondF)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted((x: any) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
        //console.log('x', x);
    });

    // due to old prototype method
    it('should not have prototype pollution', () => {
        expect(InquiryP.subject === InquiryF.subject).toBe(false);
    });
});