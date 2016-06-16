var fs = require('fs');
var path = require('path');
var UglifyJS = require('uglify-js');
var _ = require('underscore');
var gutil = require('gulp-util');

module.exports = function() {
   /// 去除相对路径  
   /// require('../task/group/common'); => require('task/group/common');
   function normlizePath(ast, relativePath, rootPath) {
      var walker = new UglifyJS.TreeWalker(function(node, descend) {
         if (!(node instanceof UglifyJS.AST_Call)) {
            return;
         }

         if (node.expression.property !== undefined) {
            return;
         }

         if (node.start.value !== 'require') {
            return;
         }

         var modName = node.args[0].value;
         // console.log('-----------------------------------------------------------------------');
         // console.log('modName = ' + modName);
         // console.log('relativePath = ' + relativePath);
         // console.log(path.resolve(relativePath, modName).replace(path.resolve(rootPath), ''));
         // console.log('++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++');
         var string = new UglifyJS.AST_String({
            value: path.resolve(relativePath, modName).replace(path.resolve(rootPath), '').replace(/\\/g, '/').replace(/^\//, '')
         });
         node.args.pop();
         node.args.push(string);
      });

      ast.walk(walker);

      return ast;
   }

   function getJSDependencies(ast) {
      var deps = [];

      var walker = new UglifyJS.TreeWalker(function(node, descend) {
         if (!(node instanceof UglifyJS.AST_Call)) {
            return;
         }

         if (node.start.value !== 'require') {
            return;
         }

         if (node.expression.property !== undefined) {
            return;
         }

         if (node.args[0].value === undefined) {
            return;  
         }

         deps.push(node.args[0].value);
      });

      ast.walk(walker);

      return deps;
   }

   function moduleWalk(modName, rootPath, modulePathIsRelativePath, process, trace) {
      var ast, content, deps, fileType, filename;

      if (trace === null) {
         trace = [];
      }

      // modName = modName.replace(/\.js$/, '');
      deps = [];
      gutil.log('Module ' + modName.green + ' created.');

      content = fs.readFileSync(rootPath + modName + '.js', 'utf-8');

      ast = UglifyJS.parse(content);
      if (modulePathIsRelativePath) {
         ast = normlizePath(ast, path.dirname(path.resolve(rootPath, modName + '.js')), rootPath);
      }
      deps = getJSDependencies(ast);
      process(modName, ast);

      return deps.map(function(modName) {
         if ((trace.indexOf(modName)) === -1) {
            trace.push(modName);
            return moduleWalk(modName, rootPath, modulePathIsRelativePath, process, trace);
         }
      });
   }

   function generateJSCode(ast, modName, sourceMapOptions, isDebug) {
      var string = new UglifyJS.AST_String({
         value: modName
      });

      var walker = new UglifyJS.TreeWalker(function(node, descend) {
         if (node instanceof UglifyJS.AST_Call && node.start.value === 'define' && node.args.length === 1) {
            node.args.unshift(string);
         }
      });

      ast.walk(walker);

      var sourceMap = null;
      if (sourceMapOptions) {
         sourceMap = UglifyJS.SourceMap();
      }
      
      if (!isDebug) {
         ast.figure_out_scope();
         ast.compute_char_frequency();
         ast.mangle_names();
      }
      
      var code = ast.print_to_string({
         // comments: 'all',
         beautify: (typeof isDebug !== 'undefined' && isDebug) ? true : false,
         ascii_only: true,
         source_map: sourceMap
      });

      return {
         code: code,
         map: sourceMap && sourceMap.toString()
      };
   }

   return {
      moduleWalk: moduleWalk,
      generateJSCode: generateJSCode
   };
};