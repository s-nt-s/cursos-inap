import re
from functools import lru_cache
from urllib.parse import urljoin

from bunch import Bunch

from .decorators import JsonCache
import requests
from datetime import date, datetime
import json
from unidecode import unidecode

re_sp = re.compile(r"\s+")
re_rtrim1 = re.compile(r"\s+\(En\s+l[ií]nea\s*-\s*\w+\)\s*$", re.IGNORECASE)
re_rtrim2 = re.compile(r"\s*(HORAS|HL|H)\s*\.?\s*$", re.IGNORECASE)

WEEK=tuple('Lunes Martes Miércoles Jueves Viernes Sábado Domingo'.split())
MONTH=tuple('0 ene feb mar abr may jun jul ago sep oct nov dic'.split())

def sort_str(s, *args):
    s = unidecode(s.lower())
    return (s, args)

class Curso(Bunch):
    def __init__(self, *args, **kargv):
        super().__init__(*args, **kargv)
        self.dtInicio = datetime.strptime(self.fechaInicio, "%Y-%m-%d") if self.fechaInicio else None
        self.dtFin = datetime.strptime(self.fechaFin, "%Y-%m-%d") if self.fechaFin else None

    def get_fecha(self):
        if self.dtInicio is None and self.dtFin is None:
            return None
        if self.dtInicio == self.dtFin or (self.dtInicio is None or self.dtFin is None):
            dt = self.dtInicio or self.dtFin
            return '''
                <span class="d2" title="{}">{}</span>/{}
            '''.format(WEEK[dt.weekday()], dt.day, MONTH[dt.month])
        if self.dtInicio.year == self.dtFin.year and self.dtInicio.month == self.dtFin.month:
            return '''
                <span class="d2" title="{}">{}</span>-<span class="d2" title="{}">{}</span>/{}
            '''.format(WEEK[self.dtInicio.weekday()], self.dtInicio.day, WEEK[self.dtFin.weekday()], self.dtFin.day, MONTH[self.dtInicio.month])

        if self.dtInicio.year == self.dtFin.year:
            return '''
                <span class="d2" title="{}">{}</span>/{} - <span class="d2" title="{}">{}</span>/{}
            '''.format(WEEK[self.dtInicio.weekday()], self.dtInicio.day, MONTH[self.dtInicio.month], WEEK[self.dtFin.weekday()], self.dtFin.day, MONTH[self.dtFin.month])
        return '''
            <span class="d2" title="{}">{}</span>/{}/{} - <span class="d2" title="{}">{}</span>/{}/{}
        '''.format(WEEK[self.dtInicio.weekday()], self.dtInicio.day, MONTH[self.dtInicio.month], self.dtInicio.year-2000, WEEK[self.dtFin.weekday()], self.dtFin.day, MONTH[self.dtFin.month], self.dtFin.year-2000)


class Api:
    def __init__(self):
        _url = "https://buscadorcursos.inap.es/apicursos/cursos/?initDate={}&endDate={}&open={}"
        today = date.today()
        fin = today.replace(year = today.year + 1).strftime("%Y%m%d")
        self.url_all = _url.format(
            today.replace(year = today.year - 2).strftime("%Y%m%d"),
            fin, "false"
        )
        self.url_open = _url.format(
            today.strftime("%Y%m%d"),
            fin, "true"
        )

    def collect(self, url, expand=False):
        r = requests.get(url)
        cursos = r.json()
        if expand:
            for c in cursos:
                d = requests.get("https://buscadorcursos.inap.es/apicursos/curso/"+c["idAccion"])
                c.update(d.json())
        for c in cursos:
            for k, v in list(c.items()):
                if not isinstance(v, str):
                    continue
                v = re_sp.sub(" ", v).strip()
                c[k] = v
                if v == "":
                    c[k]=None
                    continue
                if k == "denominacion":
                    v = re_rtrim1.sub("", v).strip()
                    if v.upper() == v:
                        v = v.capitalize()
                    c[k] = v
                if k == "duracion":
                    v = re_rtrim2.sub("", v).strip()
                    c[k] = v
                if (k.startswith("id") or k in ("duracion", "maxAlumnos")) and v.isdigit():
                    c[k] = int(v)
                elif v in ("true", "false"):
                    c[k] = v == "true"
                elif k == "lugar":
                    if c.get("modalidad") in ("ON LINE", "EN LÍNEA DINAMIZADA", "A TU RITMO", "EN LÍNEA TUTORIZADA"):
                        c[k] = "ON LINE"
                        continue
                    if c.get("modalidad") == "MIXTO" and v.lower().endswith(" - on line"):
                        v = v.rsplit(" - ", 1)[0]
                        c[k] = v
                    if v.upper() == v:
                        c[k] = v.title()
                if k.startswith("url") and v:
                    c[k] = urljoin("https://buscadorcursos.inap.es",v)
        cursos = sorted(cursos, key=lambda c: c["idAccion"])
        return cursos

    @JsonCache(file="data/cursos.json", maxOld=1)
    def collects_cursos(self):
        return self.collect(self.url_open, expand=True)

    @property
    @lru_cache(maxsize=None)
    def cursos(self):
        return [Curso(c) for c in self.collects_cursos()]

    @property
    @lru_cache(maxsize=None)
    def combos(self):
        r = requests.get("https://buscadorcursos.inap.es/apicursos/combos")
        return r.json()

    def get_combos(self, tipo):
        r = {}
        for i in self.combos:
            if i["tipo"] == tipo:
                k = i["idn"]
                if k.isdigit():
                    k = int(k)
                v = i["des"]
                if v.upper()==v:
                    v=v.capitalize()
                v = re.sub(r"\bUE\b", "UE", v, flags=re.IGNORECASE)
                r[k]=v
        return r


    def get_kv(self, cursos):
        if isinstance(cursos, str):
            print(cursos)
            cursos = self.collect(cursos)
            print(len(cursos))
        lugares=set()
        kv={
            "area" : set()
        }
        for c in self.collects_cursos():
            if c.get("lugar"):
                lugares.add(c["lugar"])
            for k, v in c.items():
                if v is not None and k.startswith("id"):
                    x = k[2].lower() + k[3:]
                    if x in c:
                        obj = kv.get(x, set())
                        lb = c[x]
                        if lb.upper() == lb:
                            lb = lb.capitalize()
                        obj.add((c[k], lb))
                        kv[x] = obj
        visto = set(k for k, _ in kv["area"])
        for k, v in self.get_combos("AREA").items():
            if k not in visto:
                kv["area"].add((k, v))
        for k, v in list(kv.items()):
            kv[k]={a:b for a,b in sorted(kv[k], key=lambda x: sort_str(x[1], x[0]))}
        kv["lugar"]=sorted(lugares, key=sort_str)
        return kv

if __name__ == "__main__":
    a = Api()
    a.collects_cursos()
    print(json.dumps(a.get_kv(a.url_all), indent=2))
