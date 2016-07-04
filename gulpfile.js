var gulp = require('gulp');
var path = require('path');
var fs = require('fs');
var $ = require('gulp-load-plugins')();
var colors = require('colors');
var runSequence = require('run-sequence');
var through = require('through2');
var filter = require('gulp-filter');
var gutil = require('gulp-util');
var spritesmith = require('gulp.spritesmith');
var del = require('del');
var gulpif = require('gulp-if');
var beautify = require('gulp-beautify');
var less = require('gulp-less');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var webpack = require('webpack-stream');
var named = require('vinyl-named');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var htmlmin = require('gulp-htmlmin');
var imagemin = require('gulp-imagemin');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var size = require('gulp-size');
var useref = require('gulp-useref');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var print = require('gulp-print');
var replace = require('gulp-replace');
var prefix = require('gulp-prefix');
var Ftp = require('ftp');
var Pem = require('pem');
var slash = require('slash');
var debug = require('gulp-debug');
var cmdModule = require('./gulp/lib/cmdModule')();
var UglifyJS = require('uglify-js');
// var merge = require('merge-stream');
var packageJson = require('./package.json');
var CONFIG = {
   isDebug: false,
   isPreview: false,
   isDeploy: false
};

var projectDirPath = packageJson.sftp.dirPath + packageJson.project + '/';

var cdnPath = packageJson.cdnDomain + projectDirPath;

console.log('cdnPath = ' + cdnPath);

gulp.task('sprite', function(cb) {
   var spriteOptions = require('./gulp/options/sprites')();
   var item = {}, spriteData = null;
   Object.keys(spriteOptions).map(function(key, index) {
      item = spriteOptions[key];
      // console.log('------------------------------------------------');
      // console.log(item);
      spriteData = gulp.src(item.src)
                       .pipe(spritesmith(item))
                       .pipe(gulp.dest('./'));
   });

   return spriteData;
});

var AUTOPREFIXER_BROWSERS = [
   'ie >= 6',
   'ie_mob >= 6',
   'ff >= 30',
   'chrome >= 34',
   'safari >= 7',
   'opera >= 23',
   'ios >= 7',
   'android >= 4.4',
   'bb >= 10'
];

gulp.task('less', function() {
   return gulp.src('less/**/*.less')
               .pipe(less({
                  modifyVars: {
                     // 'imgPath': '"/image"'
                  }
               }))
               // .pipe(sourcemaps.init())
               .pipe(autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
               // .pipe(sourcemaps.write('.'))
               .pipe(gulp.dest('style'))
               .pipe(connect.reload());
});

gulp.task('webpack', function() {
   return gulp.src('script/page_webpack/*.js')
              .pipe(named())
              .pipe(webpack(require('./webpack.config.js')))
              .pipe(gulp.dest('script/dest/'))
              .pipe(connect.reload());
});

gulp.task('watch', function () {
   gulp.watch('less/**/*.less', ['less']);

   gulp.watch(['script/**/*.@(js|handlebars)', '!script/dest/**/*.js'], ['webpack']);
});

gulp.task('webserver:dev', function() {
   connect.server({
      root: './',
      port: 8081,
      livereload: true
   });
});

gulp.task('webserver:deploy', function() {
   connect.server({
      root: './dist',
      port: 8081,
      livereload: false
   });
});

gulp.task('clean', function (cb) {
   return del([
      'dist/**',
      'html/dest/**',
      'image/sprites/**',
      'less/sprite/**',
      'style/**',
      'script/dest/**',
      'test/**'
   ], {force: true}, cb);
});

gulp.task('dev', function (done) {
   CONFIG['isDebug'] = true;
   runSequence(
      'clean',
      'sprite',
      'less',
      'webpack',
      'webserver:dev',
      'watch',
   done);
});

gulp.task('preview', function (done) {
   CONFIG['isPreview'] = true;
   runSequence(
      ['clean'],
      ['sprite'],
      ['less'],
      ['webpack'],
      ['useref'],
      ['minifyHtml'],
      ['combo'],
      ['rev'],
      ['htmlReplace'],
      ['cssReplace'],
      ['replaceTmpl'],
      ['webserver:deploy'],
   done);
});

gulp.task('deploy', function (done) {
   CONFIG['isDeploy'] = true;
   runSequence(
      ['clean'],
      ['sprite'],
      ['less'],
      ['webpack'],
      ['useref'],
      ['minifyHtml'],
      ['combo'],
      ['rev'],
      ['htmlReplace'],
      ['cssReplace'],
      ['sftp:files'],
      ['sftp:upload'],
      ['webserver:deploy'],
   done);
});

gulp.task('useref', function() {
   var htmlFilter = filter('**/*.html', { restore: true });
   var jsFilter = filter('**/*.js', { restore: true });

   return gulp.src('html/*.html')
              .pipe(useref({
                 // noAssets: true,
              }))
              .pipe(jsFilter)
              .pipe(gulp.dest('./script'))
              .pipe(jsFilter.restore)
              // .pipe(print())
              .pipe(htmlFilter)
              // .pipe(gulpif('*.js', uglify()))
              // .pipe(gulpif('*.css', cssmin()))
              .pipe(gulp.dest('./html/dest'));
});

gulp.task('minifyHtml', function() {
   return gulp.src('./html/dest/**/*.html')
              .pipe(htmlmin({
                  minifyCSS: true,
                  minifyJS: true,
                  collapseWhitespace: false
               }))
              .pipe(gulp.dest('dist/html'));
});

gulp.task('rev', function(){
   var cssFilter = filter('**/*.css', { restore: true });
   var jsFilter = filter('**/*.js', { restore: true });
   var imageFilter = filter('**/*.png', { restore: true });

   var condition = function () { // TODO: add business logic
      return true;
   }
   // 'script/page/**/*.js', 
   return gulp.src(['style/page/**/*.css', 'script/dest/**/*.js', 'image/page/**/*', 'image/sprites/**/*'], {base: '.'})
              .pipe(cssFilter)
              // .pipe(print())
              .pipe(cssmin({
                 keepBreaks: !CONFIG['isDeploy']
              }))
              .pipe(cssFilter.restore)
              .pipe(jsFilter)
              .pipe(gulpif(CONFIG['isDeploy'], uglify({
                 output: {
                    ascii_only: true
                 }
              }), beautify()))
              .pipe(jsFilter.restore)
              .pipe(imageFilter)
              .pipe(imagemin())
              .pipe(size({title: 'source images'}))
              .pipe(imageFilter.restore)
              .pipe(rev())
              .pipe(gulp.dest('dist'))
              .pipe(rev.manifest())
              .pipe(gulp.dest('dist'));
});

gulp.task('htmlReplace', function(){
  var manifest = gulp.src('./dist/rev-manifest.json');
  
  return gulp.src('./dist/html/**/*.html', {base: '.'})
             .pipe(revReplace({manifest: manifest}))
             .pipe(gulpif(CONFIG['isDeploy'], replace(/(\s(?:href|src)=['"])[\.\/]*([^'"]+)(['"])/gi, function ($0, $1, $2, $3) {
                return $1 + cdnPath + $2 + $3;
             })))
             .pipe(gulp.dest('./'));
});

gulp.task('replaceTmpl', function(){
   var commonHeaderCode = fs.readFileSync('./gulp/tmpl/common_header.html', 'utf-8');
   var commonFooterCode = fs.readFileSync('./gulp/tmpl/common_footer.html', 'utf-8');
   var commonLogCode = fs.readFileSync('./gulp/tmpl/common_log.html', 'utf-8');
   var srcStream = CONFIG['isPreview'] ? gulp.src('./dist/html/**/*.html', {base: '.'}) : gulp.src('./html/**/*.html', {base: '.'})

   return srcStream.pipe(through.obj(function(file, encode, cb) {
                  var contents = file.contents.toString(encode);
                  var codes = contents.replace('<!--#include virtual="/special/sp/spnav.html" -->', commonHeaderCode)
                                      .replace('<!--#include virtual="/special/sp/foot.html" -->', commonFooterCode)
                                      .replace('<!--#include virtual="/special/sp/tjcode.html" -->', commonLogCode);
                  file.contents = new Buffer(codes, encode);
                  cb(null, file, encode);
              }))
              .pipe(gulp.dest('./'));
});

gulp.task('cssReplace', function(){
  var manifest = gulp.src('./dist/rev-manifest.json');

  return gulp.src(['./dist/style/**/*.css'], {base: '.'})
             .pipe(revReplace({manifest: manifest}))
             .pipe(gulpif(CONFIG['isDeploy'], replace(/[\.\/]*\/(image)/gi, function ($0, $1) {
                return cdnPath + $1;
             })))
             .pipe(gulp.dest('./'));
});

gulp.task('combo', function(cb){
   var loader = fs.readFileSync(path.resolve(__dirname, './gulp', 'lib', 'loader.js'), 'utf-8');
   var loaderCode = cmdModule.generateJSCode(UglifyJS.parse(loader), 'lib/loader', false).code;
   var isDebug = true;
   var cwd = '/script/';
   var modulePathIsRelativePath = false;
   // console.log(loaderCode);

   return gulp.src(['./script/page/*.js'])
               .pipe(through.obj(function(file, encode, cb) {
                  if (!file.isNull()) {
                     var jsFile = slash(file.path);
                     var root = slash(__dirname) + cwd;
                     var newLine = '';
                     if (isDebug) {
                        newLine = '\r\n';
                     }
                     var modName = jsFile.replace(root, '').replace(/\.js$/, '');
                     gutil.log('Page ' + modName.cyan + ' created.');

                     var depsQueue = [];
                     var modules = {};
                     cmdModule.moduleWalk(modName, root, modulePathIsRelativePath, function(modName, ast) {
                        if (!modules[modName]) {
                           var result = cmdModule.generateJSCode(ast, modName, false);
                           modules[modName] = result.code;
                           // console.log('*******************************************');
                           // console.log(modules[modName]);
                        }
                     }, depsQueue);

                     depsQueue = depsQueue.sort();
                     depsQueue.push(modName);

                     // console.log(depsQueue);

                     var finalCode = depsQueue.reduce(function(memo, modName) {
                        return memo + modules[modName] + newLine;
                     }, loaderCode + newLine);

                     // var destFile = path.normalize(file.dest);

                     file.contents = new Buffer(finalCode, encode);
                  }
                  cb(null, file, encode);
               }))
               .pipe(gulp.dest('./script/dest/page'));
});

var sftpFiles = [];

gulp.task('sftp:files', function(cb){
   return gulp.src(['./dist/style/**', './dist/script/**', './dist/image/**'])
               .pipe(through.obj(function(file, encode, cb) {
                  if (!file.isNull()) {
                     sftpFiles.push(slash(path.relative(process.cwd(), file.path)))
                  }
                  cb(null, file, encode);
               }));
});


///TODO: 处理ftp根目录权限
var fixedFtpPath = (function () {
   var ftpBasePath = packageJson.sftp.ftpBasePath || '/';
   ftpBasePath = ftpBasePath.replace(/^\/|\/$/gi, '');

   return function (path) {
      if (ftpBasePath !== '') {
         path = path.replace(new RegExp('^\/' + ftpBasePath), '');
      }
      return path;
   }
})();

gulp.task('sftp:upload', function(cb){
   var ftp = new Ftp();
   var ftpFiles = [];

   ftp.on('ready', function() {
      gutil.log('[INFO] ftp connect ready!!!!');
      ftp.cwd(projectDirPath, function (err) {
         if (err) {
            gutil.log('[INFO] ftp mkdir ' + fixedFtpPath(projectDirPath).green);
            ftp.mkdir(fixedFtpPath(projectDirPath), true, function() {
               startFtp();
            });
         } else {
            startFtp();
         }
      });
   });

   function startFtp() {
      gutil.log('[INFO] ftp start!!!!')
      var walkInto = function (src, callback) {
         src = fixedFtpPath(src);
         gutil.log('[INFO] ftp list src = ' + src);

         ftp.list(src, function (err, files) {
            var pending = typeof files !== 'undefined' ? files.length : 0;
            if (!pending) {
               return callback();
            }
            files.forEach(function (item) {
               var filePath = src + item.name;
               if (item.type === 'd') {
                  filePath = filePath + '/';
                  walkInto(filePath, function(err, res){
                     if (!--pending) {
                        callback();
                     }
                  });
               } else {
                  ftpFiles.push(filePath.replace(fixedFtpPath(projectDirPath), ''));
                  if (!--pending) {
                     callback();
                  }
               }
            });
         });
      };
      
      walkInto(projectDirPath, function () {
         // console.log(ftpFiles);
         var newFiles = sftpFiles.filter(function (file) {
            var flag = true;

            if (ftpFiles.indexOf(file.replace(/^dist\//i, '')) !== -1) {
               flag = false;
            }
            return flag;
         });
         // console.log(newFiles);
         uploadFiles(newFiles);
      });
   }

   function uploadFiles(newFiles) {
      gutil.log('[INFO] ftp uploading!!!!');
      var i = 0;

      var filesLength = newFiles.length;
      if (newFiles.length != 0) {
         gutil.log('[INFO]' + new String(filesLength) + ' 个文件需要上传.');
         
         newFiles.forEach(function(file) {
            var destPath = projectDirPath + file.replace(/^dist\//i, '');
            destPath = fixedFtpPath(destPath);
            // console.log('destPath = ' + destPath);
            ftp.mkdir(destPath.match(/(.*)\/.*/)[1], true, function() {
               ftp.put(file, destPath, function(err) {
                  if (err) {
                     gutil.log(err);
                  } else {
                     i++;
                     gutil.log('[INFO] File ' + destPath.cyan + ' uploaded.' + ' 还有 ' + new String(filesLength - i).cyan + ' 个文件需要上传.');
                     if (i == filesLength) {
                        ftp.end();
                        gutil.log('upload Done!'.green)
                        cb();
                     }
                  }
               });
            });
         });
      } else {
         ftp.end();
         gutil.log('[INFO] no file to upload!'.green)
         cb();
      }
   };

   Pem.createCertificate({}, function(err, keys) {
      if (err) {
         gutil.log(err)
      }
      keys = keys || {};

      var options = packageJson.sftp;

      ftp.connect({
         host: options.auth.host,
         port: options.auth.port,
         user: options.auth.user.username,
         password: options.auth.user.password,
         secure: options.auth.secure,
         secureOptions: {
            key: undefined,
            cert: undefined,
            requestCert: true,
            rejectUnauthorized: false
         }
      });
   });
});

gulp.task('default', function() {
   // 将你的默认的任务代码放在这
   console.log('default task');
});