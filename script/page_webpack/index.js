require('../module/index.js')();
var context = {
   title: 'My New Post',
   body: 'This is my first post!',
   books: [
      { title: 'A book', synopsis: 'With a description' },
      { title: 'Another book', synopsis: 'From a very good author' },
      { title: 'Book without synopsis' }
   ]
};
var Handlebars = require('../template/entry.handlebars');
var tmpl = Handlebars(context);
console.log(tmpl);