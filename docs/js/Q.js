Array.prototype.sortMix = function () {
  var nb=[];
  var st=[];
  var ot=[];
  var i, c, t;
  for (i=0;i<this.length;i++) {
    c = this[i];
    t = (typeof c);
    if (t == "string") st.push(c);
    else if (t == "number") nb.push(c);
    else ot.push(c);
  }
  return st.sort().concat(nb.sort(function(a, b) {
    return a-b;
  })).concat(ot.sort());
}
function toQuery(obj) {
  var str = [];
  for(var p in obj)
     str.push(
       encodeURIComponent(p) + "=" +
       (encodeURIComponent(obj[p])).replace(/%20/g, '+')
     );
  return str.join("&");
}


class MKQ {
  constructor(qr) {
    this.qr = qr ||
      window.location.search.substr(1) ||
      window.location.hash.substr(1);
    this.Q = MKQ.parse(this.qr);
  }
  static parse(qr) {
    if (qr==null || qr.length==0) return null;
    var _Q={};
    if (qr=="todos") {
      _Q["todos"]=true;
      return _Q;
    }
    var k, v;
    qr.split("&").forEach((item, i) => {
        var pair = item.split('=');
        k = decodeURIComponent(pair[0]);
        v = decodeURIComponent(pair[1] || '').replace(/\++/g, " ").trim();
        if (pair.length==1 || v.length==0) {
          _Q[k]=true;
          return;
        }
        _Q[k] = v;
    });
    "area !area".split(/\s+/).forEach((k, c) => {
      if (k in _Q) {
        _Q[k] = [...new Set(_Q[k].split(/\s+/).map(function(i){
          return /^\d+$/.test(i)?Number(i):i;
        }))].sortMix();
      }
    });
    if (_Q["lugar"] == "online") {
      _Q["online"] = true;
      delete _Q["lugar"];
    }
    if (_Q["q"]!=null && typeof _Q["q"]!= "string") {
      delete _Q["q"];
    }
    console.log(_Q);
    return _Q;
  }
  static toString(_Q) {
    if (_Q==null || Object.keys(_Q).length==0) return null;
    var new_qr=[];
    var N_QA={};
    var N_QB={};
    for (const [k, v] of Object.entries(_Q)) {
      if (v==true || (k=="online" && v=="on")) new_qr.push(k);
      else if (Array.isArray(v)) N_QA[k]=v.join(" ");
      else N_QB[k]=v;
    }
    [N_QB, N_QA].forEach(function (N) {
      if (Object.keys(N).length) new_qr.push(toQuery(N));
    });
    new_qr = new_qr.join("&").trim();
    if (new_qr.length==0) return null;
    return new_qr;
  }
  toString() {
    return MKQ.toString(this.Q);
  }
  redirect() {
    var new_qr = this.toString();
    if (new_qr==null || this.qr==new_qr) return false;
    window.location.search="?"+new_qr;
    console.log("REDIRECT:\n   "+this.qr+" -->\n   "+new_qr);
    return true;
  }
  get(k, spl) {
    if (this.Q==null) return null;
    var v = this.Q[k];
    if (typeof v == "string") {
      if (v==null || v.trim().length==0) return null;
      if (spl!=null && v!=null) {
        v = v.split(spl).filter(function(s){return s.length})
        if (v.length==0) return null;
      }
    }
    return v;
  }
  isEmpty() {
    return this.Q==null || Object.keys(this.Q).length==0;
  }
}

Q = new MKQ();
Q.redirect();
