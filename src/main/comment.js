_.popup.comment = {
  active: false,
  loaded: false,
  offset: 0,

  clear: function() {
    var show_form = _.conf.popup.show_comment_form;
    _.popup.dom.root.classList.remove('pp-comment-mode');
    _.popup.dom.root.classList[show_form ? 'add' : 'remove']('pp-show-comment-form');
    this.update_hide_stamp_comments();
    this.active = false;
    this.loaded = false;
    this.offset = 0;
  },

  update_hide_stamp_comments: function() {
    var hide = _.conf.popup.hide_stamp_comments;
    _.popup.dom.root.classList[hide ? 'add' : 'remove']('pp-hide-stamp-comments');
    _.popup.adjust();
  },

  // update: function() {
  //   if (_.emoji_series) {
  //     if (!_.emoji_map) {
  //       _.emoji_map = {};
  //       _.emoji_series.forEach(function(item) {
  //         _.emoji_map[item.name] = item;
  //       });
  //     }
  //     if (!_.emoji_re) {
  //       var pat = _.emoji_series.map(function(item) { return _.escape_regex(item.name); }).join('|');
  //       _.emoji_re = new RegExp('\\((' + pat + ')\\)', 'g');
  //     }
  //   }

  //   _.qa('._comment-item', _.popup.dom.comment).forEach(this.update_comment_item.bind(this));
  //   _.qa('._comment-sticker-item', _.popup.dom.comment).forEach(this.update_comment_stamp_item.bind(this));
  //   _.popup.adjust();
  // },

  // update_comment_item: function(item) {
  //   if (_.q('.sticker-container', item)) {
  //     item.classList.add('pp-stamp-comment');
  //   }

  //   _.qa('img[data-src]', item).forEach(function(img) {
  //     img.src = img.dataset.src;
  //     img.removeAttribute('data-src');
  //   });

  //   if (_.emoji_re) {
  //     var body = _.q('.body p', item);
  //     if (body) {
  //       var html;
  //       html = body.innerHTML.replace(_.emoji_re, function(all, name) {
  //         var emoji = _.emoji_map[name];
  //         if (!emoji) {
  //           return all;
  //         }
  //         return '<img src="' + emoji.url + '" class="emoji-text" width="28" height="28">';
  //       });
  //       if (html !== body.innerHTML) {
  //         body.innerHTML = html;
  //       }
  //     }
  //   }
  // },

  // update_comment_stamp_item: function(item) {
  //   _.qa('img[data-src]', item).forEach(function(img) {
  //     img.src = img.dataset.src;
  //     img.removeAttribute('data-src');
  //   });
  // },

  scroll: function() {
    _.popup.dom.caption_wrapper.scrollTop = _.popup.dom.caption.offsetHeight;
  },

  show_form: function() {
    if (_.popup.dom.root.classList.add('pp-show-comment-form')) {
      var that = this;
      w.setTimeout(function() {
        that.form.comment_textarea.focus();
      }, 0);
    }
  },

  hide_form: function() {
    _.popup.dom.root.classList.remove('pp-show-comment-form');
  },

  toggle_form: function() {
    _.popup.dom.root.classList.toggle('pp-show-comment-form');
  },

  delete_comment: function(id, elem) {
    if (!confirm(_.lng.delete_comment_confirm)) {
      return;
    }

    _.popup.status_loading();
    _.popup.api.post(
      '/rpc_delete_comment.php',
      {
        i_id: _.popup.illust.id,
        del_id: id,
        tt: _.api.token
      },
      function(data) {
        if (data.error) {
          _.popup.status_error(data.message);
        } else {
          elem.parentNode.removeChild(elem);
          _.popup.status_complete();
        }
      }
    );
  },

  // get_comment_item: function(target) {
  //   for(var p = target.parentNode; p; p = p.parentNode) {
  //     if (p.classList.contains('_comment-item') || p.classList.contains('sticker-item')) {
  //       return p;
  //     }
  //   }
  //   return null;
  // },

  load: function(illust) {
    if (this.loaded) {
      return;
    }

    _.clear(_.popup.dom.comment);

    this.form_cont = _.e('div', {id: 'pp-popup-comment-form-cont'}, _.popup.dom.comment);
    this.form = new _.CommentForm2(this.form_cont, _.popup.illust);
    this.form.onstatuschange = function(status, message) {
      _.popup['status_' + status](message);
    };

    var that = this;
    this.form.onsent = function(item) {
      that.add_comments([item], that.body, true);
    };

    // _.onclick(_.q('#pp-popup-comment-comments', dom.comment), function(ev) {
    //   var t, p;

    //   for(t = ev.target; t; t = t.parentNode) {
    //     if (t.classList.contains('delete-comment')) {
    //       if ((p = that.get_comment_item(t))) {
    //         that.delete_comment(p);
    //         return true;
    //       }

    //     } else if (t.classList.contains('reply')) {
    //       if ((p = that.get_comment_item(t))) {
    //         that.show_form();
    //         that.form.set_reply_to(p.dataset.id);
    //         return true;
    //       }

    //     } else if (t.classList.contains('reply-to')) {
    //       that.show_form();
    //       that.form.set_reply_to(t.dataset.id);
    //       return true;
    //     }
    //   }


    var body = this.body = _.e('div', {id: 'pp-popup-comment-comments'}, _.popup.dom.comment);
    _.popup.status_loading();

    _.popup.api.get(
      '/ajax/illusts/comments/roots',
      {
        illust_id: _.popup.illust.id,
        offset: this.offset,
        limit: 20,
        tt: _.api.token
      },
      function(data) {
        if (data.error) {
          _.popup.status_error(data.message);
        } else {
          this.offset += data.body.comments.length;
          that.add_comments(data.body.comments, body);
          _.popup.status_complete();
          that.loaded = true;
        }
      }
    );
  },

  load_replies: function(id, parent, btn) {
    var that = this;
    _.popup.status_loading();
    _.popup.api.get(
      '/ajax/illusts/comments/replies',
      {
        comment_id: id,
        page: 1,
        tt: _.api.token
      },
      function(data) {
        if (data.error) {
          _.popup.status_error(data.message);
        } else {
          that.add_comments(data.body.comments, parent);
          _.popup.status_complete();
          btn.style.display = 'none';
        }
      }
    );
  },

  add_comments: function(comments, parent, ontop) {
    var that = this;
    var ul = _.q('ul', parent) || _.e('ul', null, parent),
        before = ontop ? ul.firstChild : null;
    comments.forEach(function(item) {
      var li    = _.e('li', {cls: 'pp-popup-comment-item'}),
          imgw  = _.e('div', {cls: 'pp-popup-comment-user-image-wrapper'}, li),
          img   = _.e('a', {cls: 'pp-popup-comment-user-image ui-profile-popup'}, imgw),
          body  = _.e('div', {cls: 'pp-popup-comment-body'}, li),
          name  = _.e('a', {cls: 'pp-popup-comment-user-name'}, body),
          info  = _.e('div', {cls: 'pp-popup-comment-info'}, body);

      img.href = 'https://www.pixiv.net/member.php?id=' + item.userId;
      img.style.backgroundImage = 'url(' + item.img + ')';
      img.setAttribute('data-user-id', item.userId);
      img.setAttribute('data-user-name', item.img);
      img.setAttribute('data-src', item.userName);
      name.textContent = item.userName;
      name.href = img.href;

      if (!item.stampId) {
        var text = _.e('div', {cls: 'pp-popup-comment-text'});
        text.textContent = item.comment;
        body.insertBefore(text, info);
      } else {
        var stamp = _.e('img', {cls: 'pp-popup-comment-stamp'});
        stamp.src = 'https://source.pixiv.net/common/images/stamp/stamps/' + item.stampId + '_s.jpg';
        body.insertBefore(stamp, info);
      }

      info.textContent = item.commentDate;

      if (item.editable) {
        _.onclick(_.e('span', {cls: 'pp-popup-comment-delete', text: _.lng.delete_comment}, info),
                  that.delete_comment.bind(that, item.id, li));
      } else {
        _.onclick(_.e('span', {cls: 'pp-popup-comment-reply', text: _.lng.reply_comment}, info),
                  function() {
                    that.show_form();
                    that.form.set_reply_to(item.id);
                  });
      }

      if (item.stampId) {
        li.classList.add('pp-popup-comment-item-stamp');
      }

      if (item.hasReplies) {
        var d_rep = _.e('div',
                        {cls: 'pp-popup-comment-display-replies',
                         text: _.lng.display_replies},
                        body);
        _.onclick(d_rep, function() {
          that.load_replies(item.id, body, d_rep);
        });
      }

      ul.insertBefore(li, before);
    });
    _.popup.adjust();
  },

  start: function() {
    if (this.active) {
      return;
    }

    this.active = true;
    this.load(_.popup.illust);
    _.popup.dom.root.classList.add('pp-comment-mode');
    _.popup.show_caption();
    _.popup.adjust();
  },

  end: function() {
    if (!this.active) {
      return;
    }
    _.popup.dom.root.classList.remove('pp-comment-mode');
    this.active = false;
    _.popup.adjust();
    _.popup.dom.caption_wrapper.scrollTop = 0;
  },

  toggle: function() {
    if (this.active) {
      this.end();
    } else {
      this.start();
    }
  }
};
