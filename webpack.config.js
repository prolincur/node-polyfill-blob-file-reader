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

export default {
  mode: 'production',
  devtool: 'source-map',
  entry: {
    server: './index.js',
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'index.cjs',
  },
  target: 'node',
  node: {
    __dirname: false,
    __filename: false,
  },
  externalsPresets: { node: true },
  externals: [nodeExternals()],
  module: {
    rules: [
        {
          // Transpiles ES6-8 into ES5
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader"
          }
        }
      ]
  },
  plugins: [
    new webpack.BannerPlugin(
    'Copyright (c) 2021-23 Prolincur Technologies LLP.\nAll Rights Reserved.\n\n' +
    'Please check the provided LICENSE file for licensing details.\n' +
    '\n' +
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,\n' +
    'INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR\n' +
    'PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\n' +
    'LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT\n' +
    'OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR\n' +
    'OTHER DEALINGS IN THE SOFTWARE.\n'
    )
]
}

