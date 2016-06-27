var path = require('path');
var _ = require('lodash');
var Mustache = require('mustache');
var fs = require('fs');
var url = require('url2');

module.exports = function() {
   var itemNums = null;
   var totalArray = [];
   var REG_REPLACE_IMG_PATH = /^.+?image\//;
   var REG_REPLACE_IMG_FORMAT = /\.[a-zA-Z]+$/;

   var commonOptions = {
      cssTemplate: './gulp/lessConfig/less.template.mustache',
      engine: 'pixelsmith', ///pixelsmith,pngsmith
      algorithm: 'binary-tree',
      padding: 10,
      cssFormat: 'less',
      cssOpts: {
         base64: false
      },
      cssHandlebarsHelpers: {
         parseData: function(context, options) {
            // console.log('==================================================================================');
            // console.log(context);
            // {
            //    name: 'add',
            //    source_image: '../image/icon/add.png',
            //    image: '../../image/sprites/icon.png',
            // }
            var items = context.data.root.items;
            var key = context.data.root.options.key;
            var output_image = items[0].image || '';
            var include_path = output_image.replace(REG_REPLACE_IMG_PATH, '');
            include_path = include_path.replace(/[^\/]+?\.png$/, '');
            include_path = include_path.replace(/[^\/]+?\//gi, '../');
            /// TODO: ../../image/sprites/icon.png -> ../   
            /// TODO: ../../../image/sprites/page/home.png -> ../../
            /// TODO: ../../../image/pc/sprites/icon.png  ->  ../../
            context.data.root.options.includePath = include_path;
            
            var less_param = output_image.replace(REG_REPLACE_IMG_PATH, 'image/');
            less_param = less_param.replace(/\.png$/, '').replace(/\//g, '-');
            /// TODO: ../../image/sprites/icon.png -> image-sprites-icon
            /// TODO: ../../../image/sprites/page/home.png -> image-sprites-page-home
            /// TODO: ../../../image/pc/sprites/icon.png  ->  image-pc-sprites-icon
            // context.data.root.options.spritesLessParam = '{' + less_param + '}';
            
            // console.log(output_image.replace(REG_REPLACE_IMG_PATH, '/image/'));
            context.data.root.options.spritesLessParam = output_image.replace(REG_REPLACE_IMG_PATH, '/image/');

            var project = context.data.root.options.project || '';
            if (items.length !== 0) {
               items[items.length - 1].last = true;
            }
            items.forEach(function(item) {
               var source_image = item.source_image || '';
               source_image = url.relative(__dirname, source_image);
               var itemName = source_image.replace(REG_REPLACE_IMG_PATH, '')
                                          .replace(REG_REPLACE_IMG_FORMAT, '')
                                          .replace(/\//g, '-');
               item.lessName = itemName;
               /// TODO: ../image/icon/add.png -> icon-add
               /// TODO: ../image/page/home/down.png -> sprite-home-down
               /// TODO: ../image/pc/icon/bobi.png -> icon-bobi
               item.newName = project !== '' ? itemName.replace(new RegExp("^" + project + '-'), '') : itemName.replace(/^page\-/, 'sprite-');
               if (/hover$/.test(item.newName)) {
                  item.isHover = true;
                  item.hoverName = item.newName.replace(/\_hover$/, '');                  
                  item.extraName = item.hoverName.replace(/^[a-zA-Z0-9]*?\-/, ''); // ,.home-phone.phone-hover
               } else {
                  item.isNormal = true;
               }
            });
         }
      }
   };

   var Configs = {
      icon: {
         src: './image/icon/**/*.png',
         imgName: './image/sprites/icon.png',
         cssName: './less/sprite/icon.less',
         algorithm: 'top-down',
         cssOpts: {
            key: 'icon'
         }
      },
      wealth: {
         src: './image/wealth/**/*.png',
         imgName: './image/sprites/wealth.png',
         cssName: './less/sprite/wealth.less',
         algorithm: 'top-down',
         cssOpts: {
            key: 'wealth'
         }
      }
   };

   Object.keys(Configs).map(function(key, index) {
      var options = _.cloneDeep(commonOptions);
      var opts = Configs[key];

      Object.keys(opts).map(function(name) {
         if (options[name] && _.isObject(options[name])) {
            _.extend(options[name], opts[name]);
         } else {
            options[name] = opts[name];
         }
      });

      Configs[key] = options;
      itemNums = index;
   });

   return Configs;
}