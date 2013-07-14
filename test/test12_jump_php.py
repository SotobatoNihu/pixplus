from test_base import TestCase

try:
  from urllib.parse import quote
except ImportError:
  from urllib import quote
  pass

class Test_Jumpphp(TestCase):

  def test_jump_php(self):
    self.open('/')
    self.set_conf('general.redirect_jump_page', 0)
    self.js('location.href="/jump.php?http%3a%2f%2fexample%2ecom%2f"')
    self.wait_until(lambda d: self.url == 'http://www.pixiv.net/jump.php?http%3a%2f%2fexample%2ecom%2f')

    self.open('/')
    self.set_conf('general.redirect_jump_page', 1)
    self.js('location.href="/jump.php?http%3a%2f%2fexample%2ecom%2f"')
    self.wait_until(lambda d: self.url == 'http://example.iana.org/')

    self.open_test_user()
    link = self.find_illust(lambda: self.xa('//*[@id="pp-popup-caption"]/a[starts-with(text(), "http://")]'))
    link = link[0]
    self.js('pixplus.popup.show_caption()')
    self.assertEquals(link.get_attribute('href'), 'http://www.pixiv.net/jump.php?' + quote(link.text, ''))

    self.set_conf('general.redirect_jump_page', 2)
    self.popup_reload()

    link = self.x('//*[@id="pp-popup-caption"]/a[starts-with(text(), "http://")]')
    self.assertEquals(link.get_attribute('href'), link.text)
    pass

  pass
