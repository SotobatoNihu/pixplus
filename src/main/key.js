_.popup.key = {
  keys: [
    'bookmark_submit',
    'bookmark_end',

    function() {
      return _.popup.bookmark.active;
    },

    'qrate_start',
    'qrate_end',
    'qrate_submit',
    'qrate_select_prev',
    'qrate_select_next',

    'manga_start',
    'manga_end',
    'manga_open_page',

    'tag_edit_start',
    'tag_edit_end',

    'ugoira_play_pause',
    'ugoira_prev_frame',
    'ugoira_next_frame',

    'illust_scroll_up',
    'illust_scroll_down',
    'illust_scroll_left',
    'illust_scroll_right',
    'illust_scroll_top',
    'illust_scroll_bottom',
    'illust_page_up',
    'illust_page_down',

    'prev',
    'next',
    'prev_direction',
    'next_direction',
    'first',
    'last',
    'caption_scroll_up',
    'caption_scroll_down',
    'switch_resize_mode',
    'close',

    'rate01',
    'rate02',
    'rate03',
    'rate04',
    'rate05',
    'rate06',
    'rate07',
    'rate08',
    'rate09',
    'rate10',

    'open',
    'open_big',
    'open_profile',
    'open_illust',
    'open_bookmark',
    'open_staccfeed',
    'open_response',
    'open_bookmark_detail',
    'open_manga_thumbnail',
    'bookmark_start',
    'reload',
    'caption_toggle',
    'comment_toggle'
  ],

  activate: function() {
    if (this.conn) {
      return;
    }

    var that = this;

    this.conn = _.key.listen_global(function(key, ev, connection) {
      if (!_.popup.running || !_.key_enabled(ev)) {
        return false;
      }

      var cancel = false;

      for(var i = 0; i < that.keys.length; ++i) {
        var item = that.keys[i];

        if (item instanceof g.Function) {
          if (item.call(_.popup.input)) {
            break;
          }
          continue;
        }

        if (_.conf.key['popup_' + item].split(',').indexOf(key) >= 0) {
          var action = _.popup.input[item];
          cancel = true;
          if (action.call(_.popup.input)) {
            break;
          }
        }
      }

      return cancel;
    });
  },

  inactivate: function() {
    if (this.conn) {
      this.conn.disconnect();
      this.conn = null;
    }
  }
};