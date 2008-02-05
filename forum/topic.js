core.forum.post();
core.db.db();
Forum.Topic = function(){
    this.commentsEnabled = true;
    this.pinned = true;
    this.latestPost = null;
    this.count = 1;
    this.startPost = null;
    this.forum = null;
};

Forum.Topic.list = function(forum){
//    return db.forum.posts.find({parent: null}).sort({pinned: -1});
    return db.forum.topics.find({forum: forum}).sort({pinned: -1});
};

Forum.Topic.prototype.findFirstPost = function(){
    //return db.forum.posts.findOne( { firstpost: true, parent: topic });
    return this.startPost;
};

db.forum.topics.setConstructor(Forum.Topic);
