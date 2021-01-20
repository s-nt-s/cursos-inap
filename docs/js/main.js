var C={}

$(document).ready(function(){
$("#form_buscar").submit(function(){
  var NQ=new MKQ($(this).serialize());
  if (NQ.redirect()) return false;
  return true;
})

$(".toHide").hide();
$("#volver").attr("href", document.location.pathname);

$("#ics").click(function(){
  var sel=$(".tb_cursos:visible input.sel:checked").map(function(){
    var v = $(this).val();
    if (/^\d+$/.test(v)) v = Number(v);
    return v;
  }).get();
  if (sel.length==0) {
    alert("Ha de seleccionar al menos un curso.");
    return false;
  }
  console.log(sel);
  sel = C.getSelected(sel);
  console.log(sel);
  var cal=[]
  cal.push(`
BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
`)
  var i, c;
  for (i=0; i<sel.length;i++) {
    c=sel[i];
    cal.push(`
BEGIN:VEVENT
SUMMARY:${c.denominacion}
DTSTART;TZID=Europe/Madrid:${c.fechaInicio.replace(/\-/g,'')}
DTEND;TZID=Europe/Madrid:${(c.fechaFin || c.fechaInicio).replace(/\-/g,'')}
LOCATION:${c.lugar=='online'?'':c.lugar}
DESCRIPTION:${c.urlFicha}
URL:${c.urlFicha}
END:VEVENT
    `);
  }
  cal.push("END:VCALENDAR");
  cal = cal.map(function(i){return i.trim()})
  .join("\n").split(/\n+/).filter(function(i){
    i = i.trim().replace(/:\s+/g, ":");
    return !(
      i.length == 0 ||
      i.endsWith(":null") ||
      i.endsWith(":undefined") ||
      i.endsWith(":")
    );
  }).join("\n");
  console.log(cal);
  try {
    $("#ics_link").attr("href",
      "data:text/calendar;charset=utf8,"+ escape(cal)
    )[0].click();
  } catch (e) {
    window.open("data:text/calendar;charset=utf8," + escape(cal));
  }
})
});

function getSrtQ() {
  if (Q.get("todos") == true) {
    return "todos";
  }
  var donde="";
  var area="";
  if (Q.get("lugar")) {
    donde="en "+Q.get("lugar");
    if (Q.get("online")==true) donde=donde+" u online"
  } else {
    if (Q.get("online")==true) donde="online"
  }
  var sobre = (Q.get("q", /\s*,\s*/) || []).concat(
    (Q.get("area") || []).filter(function(a){
      return a!="NO"
    }).map(function(a){
      return (
        $("#area option[value='"+a+"']").text().trim() ||
        C.meta.area[a] ||
        ("<span class='area_notfound' data-val='"+a+"'>¿área "+a+"?</span>")
      );
    }).sort(function(a, b){
      a.localeCompare(b);
    })
  );
  var sinArea = Q.get("area")!=null && Q.get("area").indexOf("NO")>=0;
  if (sobre.length==0 && sinArea) {
    area="sin área asignada";
  }
  if (sobre.length>0 && !sinArea) {
    var a = sobre.pop();
    if (sobre.length) {
      area = "sobre "+sobre.join(", ")+" o "+a;
    } else {
      area = "sobre "+a;
    }
  }
  if (sobre.length>0 && sinArea) {
    area = "sobre "+sobre.join(", ");
    area = area + " o sin área asignada";
  }
  var l = `${donde} ${area}`.trim();
  if (Q.get("!")==true) l="not("+l+")";
  return l;
}
function buscar() {
  var q = (Q.get("q", /\s*,\s*/) || []).map(function(s){return s.toLowerCase()});
  var t, i;
  C=new Cursos(function(){
    $(".loading").append("<br/><a href='https://buscadorcursos.inap.es'>"+this.c.length+" cursos abiertos</a>");
    var online = Q.get("lugar") == "online" || Q.get("online")==true;
    var sel = this.c.filter(function(c) {
      if (Q.get("todos")==true) return true;
      if (online && c["lugar"]=="online") {}
      else if (!online && Q.get("lugar")==null) {}
      else if (c.lugar!=Q.get("lugar")) return false;
      if (q.length) {
        t = c.denominacion.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        for (i=0; i<q.length;i++) {
          if (t.indexOf(q[i])>=0) return true;
        }
      }
      if (Q.get("area")==null || Q.get("area").length==0) return true;
      if (Q.get("area").indexOf(c.idArea==null?"NO":c.idArea)>=0) return true;
      return false;
    }).filter(function(c) {
      if (Q.get("!area")!=null && Q.get("!area").length>0) {
        if (c.idArea==null && Q.get("!area").indexOf("NO")!=-1) return false;
        else if (Q.get("!area").indexOf(c.idArea)!=-1) return false;
      }
      return true;
    });
    if (Q.get("!")==true) {
      sel = this.c.filter(function(c) { return !sel.includes(c) });
    }
    this.c = sel;
    $(".loading").append("<br/>"+this.c.length+" cursos pasan el filtro ("+getSrtQ()+")");
    if (this.c.length==0) return;
    $(".loading").append("<br/>Consultando curso <span class='count'>1</span> de "+this.c.length);

    this.populate(function(i){
      var ld = this.c.filter(function(c){return c.populated}).length;
      var c = this.c[i];
      $(".loading span.count").text(ld+((ld<this.c.length)?1:0));

      var ff = c.fechaFin;
      if (c.fechaInicio && c.fechaFin) {
        if (c.fechaInicio == c.fechaFin) {
          ff = "<span class='grey'>"+c.fechaFin+"</span>";
        } else {
          var i=1;
          var f = c.fechaFin.split("-");
          while(c.fechaInicio.startsWith(f.slice(0, i).join("-"))) {i++;}
          i--;
          if (i>0) {
            ff = "<span class='grey'>"+f.slice(0,i).join("-")+"-</span>"+f.slice(i).join("-");
          }
        }
      }

      var t_lugar = (c.lugar || 'Presencial');
      if (c.lugar=='online') {
        t_lugar = "Online";
        if (c._lugar) t_lugar = t_lugar + " (" + c._lugar + ")";
      }
      var TR = $(`
        <tr>
          <td style="display:none">
            <input type="checkbox" class="sel" value="${c.idAccion}">
          </td>
          <td class="on_pre" title="${t_lugar}">
            ${c.lugar=="online"?"&#127760;":"&#127979;"}
          </td>
          <td class="td_id">
            <a href="${c.urlFicha}">${c.idAccion}</a>
          </td>
          <td class="rgt">${c.duracion || ''}</td>
          <td class="fch">
            <span title="Inicio">${c.fechaInicio || ''}</span><br>
            <span title="Fin">${ff || ''}</span>
          </td>
          <td class="td_deno">
            ${Cursos.getBr(c.denominacion)}
            <div class="destinatarios" style="display:none;">
            ${Cursos.getRequisitos(c.destinatarios).replace(/\b([ABC][1-2])\b/g,"<b>$1</b>")}
            </div>
          </td>
        </tr>
      `)
      TR.find(".destinatarios").filter(function(){
        return this.textContent.trim().length==0;
      }).remove()
      TR.find(".destinatarios").prepend("<b>Requisitos</b>: ");
      TR.find("td.fch > span").filter(function(){
        return this.textContent.trim().length==0;
      }).remove();

      if (TR.find("td.fch > span").length<2) {
        TR.find("td.fch br").remove();
        TR.find("td.fch > span").attr("title", "Inicio y fin");
      }
      var tbody = $("#resultado table tbody");
      tbody.append(TR);
      if (tbody.find("tr").length==1) tbody.closest(".tb_cursos").show();
      if (ld==this.c.length) {
        mkTableSortable();
        $("th.id").click();
        if (tbody.find("input.sel").length==1) {
          tbody.find("input.sel").prop("checked", true);
          $(".tb_cursos").find("input[type=button]")
          .val("Descargar ICS").show();
        } else {
          $(".tb_cursos").find("th,td,input[type=button]")
          .filter(":hidden").show();
        }
        $(".loading").hide()
        $(".tb_cursos").append("<p>" + (`
          Resultado de buscar cursos ${getSrtQ()}
        `.trim()
        )+".</p>"
        );
        if ($("span.area_notfound").length>0) {
          Cursos.getAreas(function(ar){
            var a=$("#area")
            for (const [k, v] of Object.entries(ar)) {
              $("span.area_notfound[data-val='"+k+"']").text(v);
            }
          })
        }
        if (tbody.find(".destinatarios").length>0) {
          $(".tb_cursos").prepend(`
            <input type="checkbox" id="dest"/> <label for="dest">Mostrar requisitos</label>
          `).find("#dest").change(function(){
            $(".tb_cursos td div.destinatarios")[this.checked?"show":"hide"]();
          });
        }
        document.title = this.c.length+" cursos INAP";
        console.log(this.c);
      }
    })
  });
}

$(document).ready(function(){
  if (!Q.isEmpty()) {
    $("#form_buscar").hide();
    $("#resultado").show();
    $("body").show();
    buscar();
    return
  }
  Cursos.getAreas(function(ar){
    var a=$("#area")
    for (const [k, v] of Object.entries(ar)) {
      if (a.find("option[value='"+k+"']").length==0) {
        a.append("<option value='"+k+"'>"+v+"</option>");
        console.log("Nueva area "+k+": "+v);
      }
    }
    a.attr("size", a.find("option").length);
  })
  new Cursos(function(){
    var l=$("#lugar")
    var opts = l.find("options");
    var visto = $([]);
    for (const i of this.meta["lugar"]) {
      var ok = l.find("option").filter(function(){
        return this.value==i || this.textContent.trim()==i;
      })
      if (ok.length==0) {
        l.append("<option>"+i+"</option>");
        console.log("Nuevo lugar "+i);
      } else {
        visto = visto.add(ok);
      }
    }
    var ko = $("#lugar").find("option").not(visto)
    ko.prop("disabled", true).prop("selected", false);
    var ok = []
    if (this.meta.sinArea) {
      ok.push("option[value='NO']")
    }
    for (const k of Object.keys(this.meta.area)) {
      ok.push("option[value='"+k+"']")
    }
    var ko = $("#area").find("option").not(ok.join(","))
    ko.prop("disabled", true).prop("selected", false);
    $("#lugar,#area").change();
  })
  $("#form_buscar").show();
  $("#resultado").hide();
  $("body").show();
  $("#lugar").change(function(){
    var hide = this.value=="online";
    $("span.yonline")[hide?"hide":"show"]();
    $("span.yonline input").prop("disabled", hide);
  }).change();
  $("#area").change(function(){
    var s_val = [];
    var i_val = [];
    $(this).val().forEach(function(x) {
      var i = parseInt(x, 10);
      if (isNaN(i)) s_val.push(x);
      else i_val.push(i);
    })
    var val = s_val.sort().concat(i_val.sort(function(a,b){return a-b}));
    $("input[name='area']").val(val.join(" "));
  }).change();
})
