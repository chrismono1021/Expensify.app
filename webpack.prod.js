const webpack = require('webpack');
const path = require('path');
const {merge} = require('webpack-merge');
const dotenv = require('dotenv');
const common = require('./webpack.common.js');

const env = dotenv.config(path.resolve(__dirname, '.env')).parsed;

module.exports = merge(common, {
    mode: 'production',
    devtool: 'source-map',
    plugins: [
        new webpack.DefinePlugin({
            __REACT_WEB_CONFIG__: JSON.stringify(env),
        })
    ],
});
