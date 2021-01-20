#!/usr/bin/env python3

from core.api import Api
from core.j2 import Jnj2
from datetime import datetime
from unidecode import unidecode

now = datetime.now()
a = Api()
kv=a.get_kv(a.url_all)
ok_area=set()
for k, v in kv["area"].items():
    v = unidecode(v.lower())
    if "tecnologia" in v or "informacion" in v:
        ok_area.add(k)

j = Jnj2("template/", "docs/")
j.save("index.html",
    kv=kv,
    now=now,
    ts=datetime.timestamp(now),
    ok_area=ok_area
)
