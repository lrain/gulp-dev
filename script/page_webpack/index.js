require('../module/index.js')();
var context = {
   title: "My New Post",
   body: "This is my first post!"
};
var Handlebars = require('../template/entry.handlebars');
var tmpl = Handlebars(context);
console.log(tmpl);