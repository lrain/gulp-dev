var countChars = function (str, len, flag, html_replace) {
   if (str) {
      console.log('str = ' + str);
      var countStr = str.replace(/[^\x00-\xff\s]/g, '**');
      console.log('countStr = ' + countStr);
      var strLen = countStr.length, newStr = [], totalCount = 0;
      if (html_replace) {
         var $elem = $('<div></div>').html(str);
         str = $elem.text();
         $elem = null;
      }

      if (strLen <=  len) {
        return str;
      } else {
        for (var i = 0; i < strLen; i++) {
           var nowValue = str.charAt(i);
           if (/[^\x00-\xff]/.test(nowValue)) {
              totalCount += 2;
           } else {
              totalCount +=1;
           }
           if (totalCount > len) {
              break;
           } else {
              newStr.push(nowValue);
           }
        }
        if (flag) {
           return newStr.join('');
        } else {
           return newStr.join('') + '...';
        }
      }
   } else {
      return '';
   }
};