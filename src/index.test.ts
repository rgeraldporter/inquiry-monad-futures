import { InquiryF, Pass, Fail, IOU } from './index';
import { InquiryP } from 'inquiry-monad';
import * as R from 'ramda';
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

// @ts-ignore
const resolveAfter1SecondF = (x: any) => Future.after(1000, Pass('passed'));

// @ts-ignore
const resolveAfter2SecondsF = (x: any) => Future.after(2000, Fail('delayed fail'));

// @ts-ignore
const resolveAfter10msF = (x: any) => Future.after(10, Fail('delayed fail'));


describe('The module', () => {
    it('should satisfy the first monad law of left identity', () => {
        // this is trickier to do with a typed monad, but not impossible
        // we cannot just do some simple math as the value much adhere to type Inquiry
        // but the law seems to be provable with objects as much as they are with numbers
        const a: Inquiry = {
            subject: Maybe.of(1),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _
        };

        const f = (n: Inquiry): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 1. unit(x).chain(f) ==== f(x)
        const leftIdentity1 = InquiryF.of(a).chain(f);
        const leftIdentity2 = f(a);

        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());

        const g = (n: Inquiry): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );

        // 1. Inquiry.of(x).chain(f) ==== f(x)
        const leftIdentity3 = InquiryF.of(a).chain(g);
        const leftIdentity4 = g(a);

        expect(leftIdentity3.join()).toEqual(leftIdentity4.join());
    });

    it('should satisfy the second monad law of right identity', () => {
        const a: Inquiry = {
            subject: Maybe.of(3),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _
        };

        const rightIdentity1 = InquiryF.of(a).chain(InquiryF.of);
        const rightIdentity2 = InquiryF.of(a);

        // 2. m.chain(unit) ==== m
        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });

    it('should satisfy the third monad law of associativity', () => {
        const a: Inquiry = {
            subject: Maybe.of(30),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _
        };

        const g = (n: Inquiry): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );
        const f = (n: Inquiry): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 3. m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))
        const associativity1 = InquiryF.of(a)
            .chain(g)
            .chain(f);
        const associativity2 = InquiryF.of(a).chain((x: Inquiry) =>
            g(x).chain(f)
        );

        expect(associativity1.join()).toEqual(associativity2.join());
    });

    it('should be able to make many checks, including async ones, and run a faulted unwrap', (done) => {
        return (InquiryF as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter2SecondsF)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted((x: any) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math,delayed fail)"
                );
                done();
            });
    });

    it('should be able to make many checks, including async ones, and run a faulted unwrap after an await', (done) => {
        return (InquiryF as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter2SecondsF)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .promise()
            .then((inq: InquiryMonad) => {
                inq.faulted((x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math,delayed fail)"
                    );
                    return x;
                });
                done();
            });
    });

    // due to old prototype method problem
    it('should not have prototype pollution', () => {
        expect(InquiryP.subject === InquiryF.subject).toBe(false);
    });

    it('should be able to map a function as an inquireMap with InquiryF', (done) => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        (InquiryF as any)
            .subject({ letter: 'M' })
            .inquire(resolveAfter10msF)
            .inquireMap(startsWith, planets)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual(['Mercury', 'Mars']);
                done();
            });
    });
});