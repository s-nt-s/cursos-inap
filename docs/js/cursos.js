DEST_RG=`
Empleados públicos del ámbito Administración General del Estado, de las Comunidades Autónomas, de las Ciudades con Estatuto de Autonomía de Ceuta y Melilla, de la Administración Local, personal de administración y servicios de las Universidades públicas y el personal funcionario al servicio de la Sociedad Estatal Correos y Telégrafos
Empleados públicos que presten servicios a través de una relación de carácter funcionarial, laboral o estatutario en el ámbito de la Administración General del Estado, de las Administraciones de las Comunidades Autónomas, de las Ciudades con Estatuto de Autonomía de Ceuta y Melilla y de la Administración Local, así como el personal de administración y servicios de las Universidades públicas y el personal de administración y servicios de las Universidades públicas y el personal funcionario al servicio de la Sociedad Estatal Correos y Telégrafos
Empleados públicos de las distintas Administraciones Públicas, Estatal, Autonómica y Local
Y que formen parte del
`.trim().split(/\n+/).map(function(s){
  s = s.trim();
  s = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/\s+/g, "\\s+");
  s = "^"+s+"\\s*(\\.|\\s*,?\\s*y)?\\s*";
  return new RegExp(s, 'i');
});

function isUpper(s) {
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  s = s.replace(/\b(mysql|ods|EELL|nivel)\b/gi, "");
  return s.toUpperCase() == s;
}

class Cursos {
  constructor(done) {
    this._index = "https://buscadorcursos.inap.es/apicursos/cursos/?initDate="+getStrFecha()+"&endDate="+getStrFecha(null, 1)+"&open=true";
    this.meta = null;
    this.c = null;
    if (done) {
      this.get(this._index, function(data) {
        this.o.c = data.map(Cursos.parse);
        this.o.buildMeta();
        this.fnc_done.apply(this.o);
      }, {fnc_done:done});
    } else {
      this.c = this.sync(this._index).map(Cursos.parse);
      this.buildMeta();
    }
  }
  static parse(c) {
    if (["ON LINE", "EN LÍNEA DINAMIZADA", "A TU RITMO", "EN LÍNEA TUTORIZADA"].indexOf(c["modalidad"])!=-1) {
      if (c["lugar"]!="online") c["_lugar"]=c["lugar"];
      c["lugar"] = "online";
    }
    if (c["urlFicha"]==null) {
      c["urlFicha"] = "https://buscadorcursos.inap.es/fichacurso/" + c["idAccion"];
    } else if (c["urlFicha"] && c["urlFicha"].startsWith("/")) {
      c["urlFicha"] = "https://buscadorcursos.inap.es" + c["urlFicha"];
    }
    for (var [k, v] of Object.entries(c)) {
      if (typeof v != "string") continue;
      v = v.replace(/\s+/g, " ").trim();
      c[k] = v;
      if (v.length==0) {
        c[k]=null;
        continue;
      }
      if (v == "true" || v == "false") {
        c[k] = (v == "true");
        continue;
      }
      var i = parseInt(v, 10);
      if (/^\d+$/.test(v) || (k=="duracion" && !isNaN(i))) {
        c[k] = i;
        continue;
      }
      if (k=="lugar") {
        v = v.replace(/(\s*\-\s*on\s*line)$/i, "").trim();
      }
      if (k=="denominacion") {
        v = v.replace("–", "-");
        v = v.replace(/\s*\(En\s+l[ií]nea\s*-\s*\w+\s*\)\s*$/i, "").trim();
        v = v.replace(/^\s*CURSO TELEPRESENCIAL[\-\s]*/i, "").trim();
        v = v.replace(/^\s*-\s*|\s*-\s*$/g, "").trim();
      }
      c[k] = v;
      if (isUpper(v)) {
        v = v.capitalize()
        .replace(/\b(mysql)\b/gi, "MySQL")
        .replace(/\b(javascript)\b/gi, "JavaScript")
        .replace(/\b(ods|cec|cert|ccn|EELL|xml|s?TIC|[A-Z]\d|bim|php|html|aapp|lopd)\b/gi, function(v) {
          return v.toUpperCase();
        })
        .replace(/\b(java)\b/gi, function(v) {
          return v.capitalize();
        })
        .replace(/^([IVXLCDM]+) curso/i, function(v) {
            v = roman_to_int(v.substr(0,v.length-6));
            return v+"º curso";
        })
        c[k] = v;
      }
    }
    return c;
  }
  buildMeta() {
    var meta={
        "lugar": new Set(),
        "sinArea": false,
        "area": {}
    }
    var a, b, c, ks, ak, bk, kk, obj;
    for (a=0; a<this.c.length; a++) {
      c = this.c[a];
      if (c["lugar"]) {
        meta["lugar"].add(c["lugar"]);
      }
      if (!c["area"]) {
        meta.sinArea = true;
      }
      ks = Object.keys(c);
      for (b=0; b<ks.length; b++) {
        ak = ks[b];
        if (!ak.startsWith("id")) continue;
        bk = ak[2].toLowerCase()+ak.substr(3);
        if (c[bk]) {
          kk = c[ak];
          obj = {}
          obj[c[ak]]=c[bk];
          meta[bk] = Object.assign({}, obj, meta[bk] || {})
        }
      }
    }
    meta["lugar"] = [...meta["lugar"]].sort(function (a, b) {
      if (a=="online") return -1;
      return a.localeCompare(b);
    });
    meta.hayOnline = meta["lugar"].indexOf("online")>=0;

    this.meta = meta;
    return this.meta;
  }
  populate(done) {
    this.c.forEach((c, i) => {
      var url = "https://buscadorcursos.inap.es/apicursos/curso/"+c["idAccion"];
      if (done) {
        var nc;
        this.get(url, function(nc) {
          nc = Cursos.parse(nc);
          nc.populated = true;
          this.o.c[this.index] = Object.assign({}, this.o.c[this.index], nc);
          this.fnc_done.apply(this.o, [this.index]);
        }, {
          fnc_done:done,
          index:i
        });
      } else {
        nc = Cursos.parse(this.sync(url));
        nc.populated = true;
        this.c[i] = Object.assign({}, this.c[i], nc);
      }
    });
  }
  getSelected(ids) {
    var i, c;
    var r=[];
    for (i=0;i<this.c.length; i++) {
      c=this.c[i];
      if(ids!=null) c.selected = ids.indexOf(c.idAccion)>=0;
      if (c.selected) r.push(c);
    }
    return r;
  }
  static _get(url, success, opt) {
    opt = Object.assign({}, {
      dataType: "json",
      url: url,
      success: success,
      o: this
    }, opt || {});
    return $.ajax(opt);
  }
  get() {
    return Cursos._get.apply(this, arguments);
  }
  sync(url) {
    return this.get(url, null, {async: false}).responseJSON;
  }
  static getAreas(done) {
    var url = "https://buscadorcursos.inap.es/apicursos/combos/";
    var _parse = function(arr) {
      var ar={}
      arr.forEach((a, i) => {
        if (a["tipo"]!="AREA") return;
        var d=a["des"];
        if (d.toUpperCase()==d) d = d.capitalize();
        d = d.replace(/\bue\b/i, "UE");
        ar[a["idn"]]=d;
      });
      return ar;
    }
    if (done) {
      Cursos._get(url, function(data) {
        this.fnc_done(this._parse(data));
      }, {
        fnc_done:done,
        _parse:_parse
      });
    } else {
      return _parse(Cursos._get(url, null, {async: false}).responseJSON);
    }
  }
  static getRequisitos(destinatarios) {
    if (destinatarios==null || typeof destinatarios != "string" || destinatarios.trim().length==0) return "";
    var r = destinatarios.replace(/•/g, " ").trim();
    DEST_RG.forEach(function(i) {
      r = r.replace(i, "").trim();
    })
    r = r.replace(/^\s*,\s*que\s*pertenezcan/i, "Pertenecer");
    return r;
  }
  static getBr(s) {
    if (s == null || s.trim().length==0) return "";
    var denominacion=[];
    s.replace(/\s*\.\s*$/, "").trim().split(/\.\s+/).forEach((f, i) => {
      if (denominacion.length==0) {
        denominacion.push(f);
      } else {
        var p=denominacion[denominacion.length-1];
        if ((p.length+f.length)<50) {
          denominacion[denominacion.length-1]=p+". "+f;
        } else {
          denominacion.push(f);
        }
      }
    });
    return denominacion.join("<br/>");
  }
}
