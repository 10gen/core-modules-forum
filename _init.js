
log.forum.info("Running forum._init");

Forum = {};

Forum.root = core.modules.forum;
Forum.renderer = ( allowModule && allowModule.forum && allowModule.forum.renderer) || Forum.root.html;

Forum.root.html.form();
core.ext.getlist();
core.user.auth();
Forum.root.controller();
Forum.root.data.thread();
Forum.root.data.topic();
core.content.search();
core.content.html();

// routes for forum
core.core.routes();
Forum.routes = new Routes();
var urls = ['editorPick', 'edpick_rss', 'index', 'moveThread', 'post_new',
    'post_split', 'search', 'sitemap', 'thread_action', 'thread_new',
    'thread_rss', 'topic_action', 'topic_edit', 'topic_hide', 'topic_move',
    'topic_new', 'topic_order', 'topic_rss', 'user_edit', 'viewthread',
    'viewtopic'];


Forum.defaultRoot = "/~~/modules/forum";
for(var i = 0; i < urls.length; i++){
    Forum.routes[urls[i]] = Forum.defaultRoot + '/' + urls[i];
}

Forum.routes.setDefault("index", null);

Forum.routes.css = new Routes();

var cssfiles = ['forum.css', 'lock-icon.gif', 'sticky-icon.gif', 'th_arrow2.gif',
    'th_arrow.gif', 'th_back.gif', 'Thumbsup-icon.gif'];

for(var i = 0; i < cssfiles.length; i++){
    Forum.routes.css[cssfiles[i]] = Forum.defaultRoot + '/css/' + cssfiles[i];
}

Forum.routes.js = new Routes();

var jsfiles = ['yui'];

for(var i = 0; i < jsfiles.length; i++){
    Forum.routes.js[jsfiles[i]] = Forum.defaultRoot + '/js/' + jsfiles[i];
}

Forum.routes.images = new Routes();

var images = ['feed-icon16x16.png'];

for(var i = 0; i < images.length; i++){
    Forum.routes.images[images[i]] = Forum.defaultRoot + '/images/' + images[i];
}

