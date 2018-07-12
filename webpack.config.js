const path = require('path');

module.exports = {
    entry: {
        'inquiry-monad-futures.min': './src/index.ts'
    },
    output: {
        path: path.resolve(__dirname, 'bundles'),
        filename: '[name].js',
        libraryTarget: 'umd',
        library: 'InquiryMonadFutures',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    devtool: 'source-map',
    externals: {
        'fluture': 'Future'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
                exclude: /node_modules/,
                query: {
                    declaration: false
                }
            }
        ]
    }
};
