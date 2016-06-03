var gulp = require('gulp');
var path = require('path');
var fs = require('fs');
var $ = require('gulp-load-plugins')();
var colors = require('colors');
var runSequence = require('run-sequence')
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
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var print = require('gulp-print');
var replace = require('gulp-replace');
var prefix = require('gulp-prefix');
var Ftp = require('ftp');
var Pem = require('pem');
var slash = require('slash');
var debug = require('gulp-debug');
var packageJson = require('./package.json');
var CONFIG = {
   isDebug: false,
   isPreview: false,
   isDeploy: false
};

var projectDirPath = packageJson.sftp.dirPath + packageJson.project + '/';

var cdnPath = packageJson.cdnDomain + projectDirPath;

console.log('cdnPath = ' + cdnPath);

gulp.task('sprite', function() {
   var spriteOptions = require('./gulp/options/sprites')();
   Object.keys(spriteOptions).map(function(key, index) {
      var item = spriteOptions[key];
      // console.log('--------------------------------------------');
      // console.log(item);

      gulp.src(item.src)
          .pipe(spritesmith(item))
          .pipe(gulp.dest('./'));
   });
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
                     'imgPath': '"/image"'
                  }
               }))
               .pipe(sourcemaps.init())
               .pipe(autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
               .pipe(sourcemaps.write('.'))
               .pipe(gulp.dest('style'))
               .pipe(connect.reload());
});

gulp.task('webpack', function() {
   return gulp.src('script/page/*.js')
              .pipe(named())
              // .pipe(webpack(require('./gulp/webpack.config.js')))
              .pipe(webpack())
              .pipe(gulp.dest('script/dest/'))
              .pipe(connect.reload());
});

gulp.task('watch', function () {
   gulp.watch('less/**/*.less', ['less']);

   gulp.watch(['script/page/**/*.js', 'script/module/**/*.js'], ['webpack']);
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

gulp.task('minifyHtml', function() {
   return gulp.src('html/*.html')
              .pipe(htmlmin({
                  minifyCSS: true,
                  minifyJS: true,
                  collapseWhitespace: false
               }))
              .pipe(gulp.dest('dist/html'));
});

gulp.task('clean', function (cb) {
   return del([
      'dist/**',
      'style/**',
      'script/dest/**',
   ], {force: true}, cb);
});

gulp.task('dev', function (done) {
   CONFIG['isDebug'] = true;
   runSequence(
      ['clean'],
      ['sprite'],
      ['less'],
      ['webpack'],
      ['webserver:dev'],
      ['watch'],
   done);
});

gulp.task('preview', function (done) {
   CONFIG['isPreview'] = true;
   runSequence(
      ['clean'],
      ['sprite'],
      ['less'],
      ['webpack'],
      ['minifyHtml'],
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
      ['minifyHtml'],
      ['rev'],
      ['htmlReplace'],
      ['cssReplace'],
      ['sftp:files'],
      ['sftp:upload'],
      ['webserver:deploy'],
   done);
});

gulp.task('rev', function(){
   var cssFilter = filter('**/*.css', { restore: true });
   var jsFilter = filter('**/*.js', { restore: true });
   var imageFilter = filter('**/*.png', { restore: true });

   var condition = function () { // TODO: add business logic
      return true;
   }

   return gulp.src(['style/page/**/*.css', 'script/dest/**/*', 'image/page/**/*', 'image/sprites/**/*'], {base: '.'})
              .pipe(cssFilter)
              // .pipe(print())
              .pipe(cssmin({
                 keepBreaks: true
              }))
              .pipe(cssFilter.restore)
              .pipe(jsFilter)
              // .pipe(uglify())
              .pipe(gulpif(condition, uglify(), beautify()))
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
             .pipe(gulpif(CONFIG['isDeploy'], replace(/([href|src]+?\=[\"\'])\.\.\/([script|style|image]+)/gi, function ($0, $1, $2) {
                return $1 + cdnPath + $2;
             })))
             .pipe(gulp.dest('./'));
});

gulp.task('replaceTmpl', function(){
   var commonHeaderCode = fs.readFileSync('./gulp/tmpl/common_header.html');
   var commonFooterCode = fs.readFileSync('./gulp/tmpl/common_footer.html');
   var commonLogCode = fs.readFileSync('./gulp/tmpl/common_log.html');
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
             .pipe(gulpif(CONFIG['isDeploy'], replace('/image/', cdnPath + 'image/')))
             .pipe(gulp.dest('./'));
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

gulp.task('sftp:upload', function(cb){
   var ftp = new Ftp();
   var ftpFiles = [];

   ftp.on('ready', function() {
      gutil.log('[INFO] ftp connect ready!!!!');
      ftp.cwd(projectDirPath, function (err) {
         if (err) {
            gutil.log('[INFO] ftp mkdir ' + projectDirPath.green);
            ftp.mkdir(projectDirPath, true, function() {
               startFtp();
            });
         } else {
            startFtp();
         }
      });
   });

   function startFtp() {
      gutil.log('[INFO] ftp start!!!!');
      var walkInto = function (src, callback) {
         gutil.log('[INFO] ftp list src = ' + src);
         ftp.list(src, function (err, files) {
            var pending = files.length;
            if (!pending) return callback();
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
                  ftpFiles.push(filePath.replace(projectDirPath, ''));
                  if (!--pending) {
                     callback();
                  }
               }
            });
         });
      };
      
      walkInto(projectDirPath, function () {
         var newFiles = sftpFiles.filter(function (file) {
            var flag = true;

            if (ftpFiles.indexOf(file.replace(/^dist\//i, '')) !== -1) {
               flag = false;
            }
            return flag;
         });
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
            ftp.mkdir(destPath.match(/(.*)\/.*/)[1], true, function() {
               ftp.put(file, destPath, function(err) {
                  if (err) {
                     gutil.log(err);
                  }
                  i++;
                  gutil.log('[INFO] File ' + destPath.cyan + ' uploaded.' + ' 还有 ' + new String(filesLength - i).cyan + ' 个文件需要上传.');
                  if (i == filesLength) {
                     ftp.end();
                     gutil.log('upload Done!'.green)
                     cb();
                  }
               });
            })
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