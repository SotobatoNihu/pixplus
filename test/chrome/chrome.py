import os
import base64
import time

from browser import Browser

class Chrome(Browser):
  name = 'chrome'
  capname = 'CHROME'

  def prepare_caps(self, caps):
    caps['chromeOptions'] = {
      'extensions': [
        self.read_file_as_base64(os.path.join(self.distdir, 'pixplus.crx')),
        self.read_file_as_base64(self.download_crx('ab.crx', 'gighmmpiobklfepjocnamgkkbiglidom'))
      ]
    }
    if self.args.chrome_bin:
      caps['chromeOptions']['binary'] = self.args.chrome_bin
      pass
    pass

  def download_crx(self, filename, ext_id, chrome_version = '37.0.2062.120'):
    url = 'https://clients2.google.com/service/update2/crx?response=redirect&prodversion=%s&x=id%%3D%s%%26uc' % (chrome_version, ext_id)
    return self.download(url, filename)

  pass

def register_args(parser):
  parser.add_argument('--chrome-command', dest = 'chrome_bin')
  pass
