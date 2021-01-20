import functools
import json
import os
import re
import time

import bunch

re_json1 = re.compile(r"^\[\s*{")
re_json2 = re.compile(r" *}\s*\]$")
re_json3 = re.compile(r"}\s*,\s*{")
re_json4 = re.compile(r"^  ", re.MULTILINE)


def obj_to_js(data):
    txt = json.dumps(data, indent=2)
    txt = re_json1.sub("[{", txt)
    txt = re_json2.sub("}]", txt)
    txt = re_json3.sub("},{", txt)
    txt = re_json4.sub("", txt)
    return txt


def save_js(file, data):
    txt = obj_to_js(data)
    with open(file, "w") as f:
        f.write(txt)


def read_js(file):
    if file and os.path.isfile(file):
        with open(file, 'r') as f:
            js = json.load(f)
            return js
    return None


class Cache:
    def __init__(self, file, *args, reload=False, maxOld=30, **kargs):
        self.file = file
        self.data = {}
        self.func = None
        self.reload = reload
        self.maxOld = maxOld
        if maxOld is not None:
            self.maxOld = time.time() - (maxOld * 86400)

    def get_file_name(self, *args, **kargs):
        return self.file

    def read(self):
        pass

    def save(self):
        pass

    def tooOld(self, fl):
        if self.maxOld is None or not os.path.isfile(fl):
            return False
        if os.stat(fl).st_mtime < self.maxOld:
            return True
        return False

    def callCache(self, slf, *args, **kargs):
        if not self.reload and not self.isReload(slf, *args, **kargs):
            data = self.read(*args, **kargs)
            if data:
                return data
        data = self.func(slf, *args, **kargs)
        self.save(data, *args, **kargs)
        return data

    def isReload(self, slf, *args, **kargs):
        reload = getattr(slf, "reload", False)
        if reload == True:
            return True
        if isinstance(reload, (list, tuple)) and self.file in reload:
            return True
        fl = self.get_file_name(*args, **kargs)
        if isinstance(reload, (list, tuple)) and fl in reload:
            return True
        if self.tooOld(fl):
            return True
        return False

    def __call__(self, func):
        functools.update_wrapper(self, func)
        self.func = func
        return lambda *args, **kargs: self.callCache(*args, **kargs)


class JsonCache(Cache):
    def __init__(self, *args, **kargv):
        Cache.__init__(self, *args, **kargv)

    def read(self, *args, **kargs):
        return read_js(self.file)

    def save(self, data, *args, **kargs):
        if isinstance(data, set):
            data = list(sorted(data))
        save_js(self.file, data)
