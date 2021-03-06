from test_base import TestCase

class Test_PageCheck(TestCase):
  pages = (
    '/mypage.php',
    '/new_illust.php',
    '/bookmark_new_illust.php',
    '/mypixiv_new_illust.php',
    '/ranking.php?mode=daily',
    '/ranking.php?mode=daily&content=ugoira',
    '/ranking_area.php',
    '/stacc/p/activity',
    '/stacc/p/activity?mode=unify',
    '/user_event.php',
    '/bookmark.php?rest=hide',
    '/member_illust.php',
    '/response.php?illust_id=11437736',
    '/member_illust.php?mode=medium&illust_id=11437736',
    '/member.php?id=11',
    '/member_illust.php?id=11',
    '/tags.php?tag=pixiv',
    '/search.php?s_mode=s_tag&word=pixiv',
    '/cate_r18.php',
    '/new_illust_r18.php',
    '/user_event.php?type=r18',
    '/search_user.php'
  )

  def test_pages(self):
    for url in self.pages:
      self.open(url)
      self.open_popup()
