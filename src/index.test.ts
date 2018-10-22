import { InquiryF, Pass, Fail, IOU, Questionset, Receipt } from './index';
import { InquiryP } from 'inquiry-monad';
import * as R from 'ramda';
import { Maybe } from 'simple-maybe';
import { Future, FutureInstance, FutureTypeRep } from 'fluture';
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
const resolveAfter10msFPass = (x: any) => Future.after(10, Pass('passed'));

const encasePromise = (x: any) => Promise.resolve(Pass('x'));
const encaseRejectedPromise = (x: any) => Promise.resolve(Fail('x'));

// @ts-ignore
const resolveEncaseFork = Future.encaseP(x => encasePromise(x));
// @ts-ignore
const rejectEncaseFork = Future.encaseP(x => encaseRejectedPromise(x));

const resolveTryFork = () =>
    // @ts-ignore
    Future.tryP(() => Promise.resolve('Hello')).map((val: any) => Pass(val));

// @ts-ignore
const resolveAfter2SecondsF = (x: any) =>
    // @ts-ignore
    Future.after(2000, Fail('delayed fail'));

// @ts-ignore
const resolveAfter10msF = (x: any) => Future.after(10, Fail('delayed fail'));

describe('The module', () => {
    it('should satisfy the first monad law of left identity', () => {
        // this is trickier to do with a typed monad, but not impossible
        // we cannot just do some simple math as the value much adhere to type Inquiry
        // but the law seems to be provable with objects as much as they are with numbers
        const a: InquiryValue = {
            subject: Maybe.of(1),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _,
            questionset: Questionset.of(['', () => {}]),
            receipt: Receipt([])
        };

        const f = (n: InquiryValue): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 1. unit(x).chain(f) ==== f(x)
        const leftIdentity1 = InquiryF.of(a).chain(f);
        const leftIdentity2 = f(a);

        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());

        const g = (n: InquiryValue): InquiryMonad =>
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
        const a: InquiryValue = {
            subject: Maybe.of(3),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _,
            questionset: Questionset.of(['', () => {}]),
            receipt: Receipt([])
        };

        const rightIdentity1 = InquiryF.of(a).chain(InquiryF.of);
        const rightIdentity2 = InquiryF.of(a);

        // 2. m.chain(unit) ==== m
        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });

    it('should satisfy the third monad law of associativity', () => {
        const a: InquiryValue = {
            subject: Maybe.of(30),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _,
            questionset: Questionset.of(['', () => {}]),
            receipt: Receipt([])
        };

        const g = (n: InquiryValue): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );
        const f = (n: InquiryValue): InquiryMonad =>
            InquiryF.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 3. m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))
        const associativity1 = InquiryF.of(a)
            .chain(g)
            .chain(f);
        const associativity2 = InquiryF.of(a).chain((x: InquiryValue) =>
            g(x).chain(f)
        );

        expect(associativity1.join()).toEqual(associativity2.join());
    });

    it('should be able to make many checks, including async ones, and run a faulted unwrap', done => {
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

    it('should be able to make many checks, including async ones, and run a faulted unwrap after an await', done => {
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

    it('should be able to map a function as an inquireMap with InquiryF', done => {
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

    it('should be able to return a Future after a fork on the fail track', done => {
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
            .inquire(resolveAfter10msFPass)
            .inquireMap(startsWith, planets)
            .fork(
                (fails: FailMonad) => {
                    expect(fails.join()).toEqual([
                        'Venus',
                        'Earth',
                        'Jupiter',
                        'Saturn',
                        'Uranus',
                        'Neptune'
                    ]);
                    return Future.of(fails.join()).fork(
                        (_: any) => expect(true).toBe(false), // shouldn't happen!
                        (results: any) => {
                            expect(results).toEqual([
                                'Venus',
                                'Earth',
                                'Jupiter',
                                'Saturn',
                                'Uranus',
                                'Neptune'
                            ]);
                            done();
                        }
                    );
                },
                (passes: PassMonad) => expect(true).toBe(false) // shouldn't happen!
            );
    });

    it('should be able to return a Future after a fork on the pass track', done => {
        const planets = ['Mercury', 'Mars'];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        (InquiryF as any)
            .subject({ letter: 'M' })
            .inquire(resolveAfter10msFPass)
            .inquireMap(startsWith, planets)
            .fork(
                (fails: FailMonad) => expect(true).toBe(false), // shouldn't happen!
                (passes: PassMonad) => {
                    expect(passes.join()).toEqual([
                        'Mercury',
                        'Mars',
                        'passed'
                    ]);
                    return Future.of(passes.join()).fork(
                        (_: any) => expect(true).toBe(false), // shouldn't happen!
                        (results: any) => {
                            expect(results).toEqual([
                                'Mercury',
                                'Mars',
                                'passed'
                            ]);
                            done();
                        }
                    );
                }
            );
    });

    it('should be able to return a Future for forking after a conclude', done => {
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
            .inquire(resolveAfter10msFPass)
            .inquireMap(startsWith, planets)
            .inquire(resolveTryFork)
            .conclude(
                (fails: any) => {
                    expect(fails.join()).toEqual([
                        'Venus',
                        'Earth',
                        'Jupiter',
                        'Saturn',
                        'Uranus',
                        'Neptune'
                    ]);
                    return fails;
                },
                (passes: PassMonad) => {
                    expect(passes.join()).toEqual([
                        'Mercury',
                        'Mars',
                        'Hello',
                        'passed'
                    ]);
                    return passes;
                }
            )
            .fork(
                (_: any) => expect(true).toBe(false), // should not reach here
                (inqValue: any) => {
                    expect(inqValue.pass.join()).toEqual([
                        'Mercury',
                        'Mars',
                        'Hello',
                        'passed'
                    ]);
                    done();
                }
            );
    });

    it('should be able to return a Future after a fork on the pass track with an encased Promise', done => {
        const planets = ['Mercury', 'Mars'];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        (InquiryF as any)
            .subject({ letter: 'M' })
            .inquire(resolveAfter10msFPass)
            .inquire(resolveEncaseFork)
            .inquireMap(startsWith, planets)
            .fork(
                (fails: FailMonad) => expect(true).toBe(false), // shouldn't happen!
                (passes: PassMonad) => {
                    expect(passes.join()).toEqual([
                        'Mercury',
                        'Mars',
                        'x',
                        'passed'
                    ]);
                    return Future.of(passes.join()).fork(
                        (_: any) => expect(true).toBe(false), // shouldn't happen!
                        (results: any) => {
                            expect(results).toEqual([
                                'Mercury',
                                'Mars',
                                'x',
                                'passed'
                            ]);
                            done();
                        }
                    );
                }
            );
    });

    it('can handle Questionsets and do inquireAll with rejections', (done: Function) => {
        const questionSet = Questionset.of([
            [
                'does it start with a capital letter?',
                (a: string): PassFailMonad =>
                    /^[A-Z]/.test(a)
                        ? Pass('starts with a capital')
                        : Fail('does not start with a capital')
            ],
            [
                'are there more than ten words?',
                (a: string): PassFailMonad =>
                    a.split(' ').length > 10
                        ? Pass('more than ten words')
                        : Fail('ten words or less')
            ],
            [
                'pause for a moment with fail',
                // @ts-ignore
                (a: string): any => Future.after(70, Fail('failed 70ms'))
            ],
            [
                'pause for a moment with pass',
                (a: string): any =>
                    // @ts-ignore
                    Future.after(100, Pass('passed 100ms'))
            ],
            [
                /^are there any line breaks\?$/,
                (a: string) =>
                    /\r|\n/.exec(a)
                        ? Pass('there were line breaks')
                        : Fail('no line breaks')
            ]
        ]);

        return InquiryF.subject('A short sentence.')
            .using(questionSet)
            .informant(console.warn)
            .inquireAll()
            .conclude(
                (fail: FailMonad) => {
                    expect(fail.join()).toEqual([
                        'ten words or less',
                        'no line breaks',
                        'failed 70ms'
                    ]);
                },
                (pass: PassMonad) => {
                    expect(pass.join()).toEqual([
                        'starts with a capital',
                        'passed 100ms'
                    ]);
                    setTimeout(done, 1);
                }
            )
            .fork(
                () => expect(true).toBe(false),
                (result: InquiryValue) => {
                    expect(result.receipt.join()[0][0]).toEqual(
                        'does it start with a capital letter?'
                    );
                    expect(result.receipt.join()[0][1].inspect()).toEqual(
                        'Pass(starts with a capital)'
                    );
                }
            );
    });
});
