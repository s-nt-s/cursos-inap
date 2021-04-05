CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
if(["s-nt-s.github.io", "apuntes.ml"].indexOf(window.location.hostname)>=0) CORS_PROXY='https://cors-asaco.herokuapp.com/';
jQuery.ajaxPrefilter(function(options) {
    if (options.crossDomain && jQuery.support.cors) {
        options.url = CORS_PROXY + options.url;
    }
});
$(document).ajaxError(function(event, jqxhr, settings, thrownError) {
  if (settings.url.startsWith(CORS_PROXY)) {
      $(".herokuerror").show();
  }
});

jQuery.fn.extend({
  column: function() {
    if (this.length!=1 && !this.is("th")) return null;
    var index=this.closest("tr").find("th").index(this);
    return this.closest("table").find("tbody tr").find("td:eq("+index+")");
  }
});
Number.prototype.pad = function(size) {
  if (size==null) size=2;
  var s = String(this);
  while (s.length < size) {s = "0" + s;}
  return s;
}
String.prototype.capitalize = function() {
  return this[0].toUpperCase()+this.substr(1).toLowerCase();
}
function getStrFecha(dt, addYear) {
  if (dt==null) dt = new Date();
  if (addYear) dt.setFullYear(dt.getFullYear() + addYear);
  var s = dt.getFullYear() + (dt.getMonth()+1).pad(2) + dt.getDate().pad(2);
  return s;
}

function char_to_int(c){
  if(c == null) throw "null no es un número romano";
  switch (c.toUpperCase()){
    case 'I': return 1;
    case 'V': return 5;
    case 'X': return 10;
    case 'L': return 50;
    case 'C': return 100;
    case 'D': return 500;
    case 'M': return 1000;
  }
  throw c+" no es un número romano";
}
function roman_to_int(str1) {
  if(str1 == null) return null;
  var num = char_to_int(str1.charAt(0));
  var pre, curr;
  for(var i = 1; i < str1.length; i++){
    curr = char_to_int(str1.charAt(i));
    pre = char_to_int(str1.charAt(i-1));
    if(curr <= pre){
      num += curr;
    } else {
      num = num - pre*2 + curr;
    }
  }
  return num;
}

function sort_table_by_me() {
  var t = $(this);
  var isReversed = (!t.is(".isSortedByMe") || t.is(".isReversed"));
  t.closest("tr").find("th").removeClass("isSortedByMe isReversed");
  t.addClass("isSortedByMe");
  var table = t.closest("table").find("tbody");
  var index = t.closest("tr").find("th").index(t);
  var tdsel = "td:eq("+index+")";
  var isStr = t.is(".txt");
  var i=0;
  var switching = true;
  var shouldSwitch = false;
  while (switching) {
    switching = false;
    var rows = table.find("tr");
    for (i = 0; i < (rows.length - 1); i++) {
      shouldSwitch = false;
      var rowA = rows.eq(i);
      var rowB = rows.eq(i+1);
      var x = rowA.find(tdsel).text().trim();
      var y = rowB.find(tdsel).text().trim();
      if (isStr) {
        x = x.toLowerCase();
        y = y.toLowerCase();
      } else {
        x = Number(x);
        y = Number(y);
      }
      if (x > y) {
        shouldSwitch = true;
        rowB.insertBefore(rowA);
        //table[0].insertBefore(rowB[0], rowA[0]);
        switching = true;
        break;
      }
    }
  }
  if (!isReversed) {
    t.addClass("isReversed");
    var trs = table.find("tr");
    for (i=1;i<=trs.length;i++) {
      trs.eq(trs.length-i).insertAfter(table.find("tr").last());
    }
  } else {
    t.removeClass("isReversed");
  }
}

function mkTableSortable(scope) {
  if (!scope) scope=$("body");
  scope = scope.filter("table:has(.isSortable)").add(scope.find("table:has(.isSortable)"));
  scope.find("thead th.isSortable").each(function(){
    var t=$(this);
    var cl = t.column().map(function(){ return this.textContent.trim() })
    var dif = [...new Set(cl.get())]
    if (dif.length<2) {
      t.removeClass("isSortable");
    }
  })
  scope.find("th.isSortable").click(sort_table_by_me).each(function(){
    if (this.title && this.title.trim().length) {
        this.title = this.title + " (haz click para ordenar)"
    } else {
        this.title = "Haz click para ordenar"
    }
  });
  scope.addClass("active_sort");
}
