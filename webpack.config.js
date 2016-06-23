module.exports = {
   // entry: '../script/index.js',
   output: {
      // path: __dirname,
      filename: '[name].js'
   },
   module: {
      loaders: [
         { test: /\.css$/, loader: 'style!css' },
         { test: /\.handlebars$/, loader: 'handlebars-loader' }
      ]
   }
};