#Inquiry Monad Futures
### v0.4.2

Inquiry chains together functions that test a given value ("subject") and return with a full set of all passes, failures, and the original untouched value. This version is to be used with a Futures library such as [Fluture](https://github.com/fluture-js/Fluture).

For a Promise-based or syncronous version, see [`inquiry-monad`](https://github.com/rgeraldporter/inquiry-monad).

## Usage

Please see the documentation at [https://github.com/rgeraldporter/inquiry-monad] for examples of how Inquiry works.

`inquiry-monad-futures` has the same API as `inquiry-monad`, but uses `InquiryF` instead as the name.

## Example of InquiryF

```js
const { InquiryF, Pass, Fail } = require('inquiry-monad-futures');

const subjectData = {
    a: 1,
    b: false
};

const hasA = x => (x.a ? Pass('has a') : Fail('does not have a'));
const validateB = x =>
    x.b && typeof x.b === 'boolean' ? Pass('b is valid') : Fail('b is invalid');
const hasNoC = x => (x.c ? Fail('has a c value') : Pass('has no c value'));

/* With Futures */
const checkDb = x =>
    Future.after(1000, Pass('pretend I looked something up in a db'));

InquiryF.subject(subjectDataWithFailure)
    .inquire(checkDb)
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .conclude(x => x, y => y);
// .conclude or another "unwrap" fn is necessary to complete "IOUs" to give a clean exit (resolve all unresolved Futures)

// >> Promise.resolve(result: {subject: {a:1, b:'string', c:true}, pass: Pass(['has a', 'pretend I looked something up in a db']), fail: Fail(['b is invalid', 'has c value']), iou: IOU()})
```

## MIT License

Copyright 2018 Robert Gerald Porter <rob@weeverapps.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.