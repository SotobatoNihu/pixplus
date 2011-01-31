#!/usr/bin/python

import sys
import os
import json
import hashlib
import re
import cgi

from common import *

mode = 'chrome'
if len(sys.argv) > 1: mode = sys.argv[1]

messages = {}
if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
  parse_po(sys.argv[2], messages)
  pass

messages_json = {}
if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
  json_fp = open(sys.argv[3], 'r')
  messages_json = json.load(json_fp)
  json_fp.close()
  pass

for line in sys.stdin:
  p = LIST_MESSAGES_REGEX.split(line)
  if len(p) > 1:
      msgid = '__MSG_%s__' % hashlib.sha1(p[1]).hexdigest()
      msgstr = p[1]
      if messages.has_key(msgstr): msgstr = messages[msgstr]['msgstr']
      messages_json[msgid] = {'message': json.loads(msgstr)}
      p[1] = '"%s"' % msgid
      sys.stdout.write(''.join(p))
      pass
  else:
    sys.stdout.write(line)
    pass
  pass

if len(sys.argv) > 3:
  json_fp = open(sys.argv[3], 'w')
  if mode == 'chrome':
    json_fp.write(json.dumps(messages_json))
  else:
    for key in messages_json.keys():
      msg = re.sub(r'&lt;br&gt;', "&#13;&#10;", cgi.escape(messages_json[key]['message']))
      json_fp.write(('<!ENTITY %s "%s">\n' % (key, msg)).encode('utf-8'))
      pass
    pass
  json_fp.close()
  pass