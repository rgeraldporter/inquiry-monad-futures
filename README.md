#Inquiry Monad Futures
### v0.4.4

Inquiry creates a process flow that allows one to chain multiple functions together to test a value ("subject"), granting observability over all results and returning a full report containing successes, failures, and the original test subject without mutation.

Inquiry's API is comparible to Promises, and is designed to have an expressive, friendly API. It utilizes the concepts of functional programming, though experience with functional programming is not meant to be a requirement for ease of use. To those experienced with functional programming, Inquiry can be compared with an `Either` or a `Validation` library.

## Documentation

Please see [`inquiry-monad`](https://github.com/rgeraldporter/inquiry-monad) for the main documentation. This module just adds the ability to use `InquiryF`, and contains no special APIs. It is equivalent to the API of `InquiryP`.

## MIT License

Copyright 2018 Robert Gerald Porter <rob@weeverapps.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.