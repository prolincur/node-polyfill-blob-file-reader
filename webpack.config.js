/*
 * Copyright (c) 2020-23 Prolincur Technologies LLP.
 * All Rights Reserved.
 */

import path from 'path'
import webpack from 'webpack'
import { fileURLToPath } from 'url'
import nodeExternals from 'webpack-node-externals'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webpackEnv = process.env.NODE_ENV || 'production'

export default {
  mode: webpackEnv,
  devtool: webpackEnv === 'development' ? 'source-map' : undefined,
  experiments: {
    outputModule: true,
  },
  entry: './index.js',
  output: {
    path: path.join(__dirname, 'build'),
    publicPath: '/',
    filename: 'index.mjs',
    chunkFormat: 'module',
  },
  target: 'es6',
  node: {
    __dirname: false,
    __filename: false,
  },
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.(?:js|mjs|cjs)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [['@babel/preset-env', { targets: 'defaults' }]],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
  resolve: {
    modules: [__dirname, 'node_modules'],
  },
  plugins: [
    new webpack.BannerPlugin(
      'Copyright (c) 2020-24 Prolincur Technologies LLP. All Rights Reserved.\n\n' +
        'This is a proprietary software and imposes following, but not limited to,\n' +
        'conditions:\n\n' +
        '1.  Redistribution and use of this software in source and binary forms,\n' +
        '	with or without modification, are not permitted without written\n' +
        '	permission of the copyright holder(s).\n\n' +
        '2.  Retention of this software in source and binary forms, are not\n' +
        '	permitted without written permission of the copyright holder(s).\n\n' +
        '3.  User must immediately destroy the copy of software after the permitted\n' +
        '	period of usage by the copyright holder(s).\n\n' +
        'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,\n' +
        'INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR\n' +
        'PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\n' +
        'LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT\n' +
        'OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR\n' +
        'OTHER DEALINGS IN THE SOFTWARE.\n'
    ),
    new webpack.BannerPlugin({
      raw: true,
      banner:
        "import { createRequire as topLevelCreateRequire } from 'module';\n if(!global.require) global.require = topLevelCreateRequire(import.meta.url);",
      stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
    }),
  ],
}
