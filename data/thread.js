/**
*      Copyright (C) 2008 10gen Inc.
*  
*    Licensed under the Apache License, Version 2.0 (the "License");
*    you may not use this file except in compliance with the License.
*    You may obtain a copy of the License at
*  
*       http://www.apache.org/licenses/LICENSE-2.0
*  
*    Unless required by applicable law or agreed to in writing, software
*    distributed under the License is distributed on an "AS IS" BASIS,
*    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*    See the License for the specific language governing permissions and
*    limitations under the License.
*/

core.content.search();
Forum.data.Thread = function(){
    this.commentsEnabled = true;
    // Whether a thread is "sticky", "pinned", or otherwise. Such threads
    // are "higher priority" and come first when listing the
    // threads in a topic.
    this.pinned = false;
    this.created = new Date();
    this.lastPostTime = new Date();
    this.latestPost = null;
    this.count = 1;
    this.editorPick = false;
    // This could be a reference to a db.forum.topic, or an ObjectId:
    // Forum.Controller.specialDeletedID or
    // Forum.Controller.specialModeratedID
    this.topic = null;
};

Forum.data.Thread.prototype.SEARCH_WEIGHTS = {
    title: 1,
    threaded_children: {
        // THREADED: this would have to change, of course, if we changed
        // reply styles
        //title: .2,
        content: .2
    }
};

Forum.data.Thread.prototype.SEARCH_OPTIONS = {
    title: {
        stripHTML: true
    },
    threaded_children: {
        filter: function(field, obj) {
            if(obj.deleted) return false;
            return true;
        },
//        title: {stripHTML: true},
        content: {stripHTML: true}
    }
};

Forum.data.Thread.prototype.presave = function() {
    Search.index( this , this.SEARCH_WEIGHTS, this.SEARCH_OPTIONS );
    Search.addToIndex( this, content.HTML.strip(this.getReplies()[0].title), 0.2);
};

Forum.data.Thread.prototype.getTitle = function() {
    return this.getFirstPost().title;
};

Forum.data.Thread.prototype.setTitle = function(title){
    this.getFirstPost().title = title;
};

Forum.data.Thread.prototype.setClosed = function(isClosed){
    this.commentsEnabled = !isClosed;
};

Forum.data.Thread.prototype.getClosed = function(isClosed){
    return !this.commentsEnabled;
};

Forum.data.Thread.prototype.getHidden = function(){
    return this.topic.getHidden();
};

Forum.data.Thread.prototype.getFirstPost = function(){
    return this.getReplies()[0];
};

Forum.data.Thread.prototype.getFirstNotDeleted = function(){
    var notdeleted = function(p) { if (p.deleted) return false; return true; };
    var reps = this.getReplies();

    for(var i = 0; i < reps.length; i++){
        if(notdeleted(reps[i])){ return reps[i]; }
    }
    return null;
};

Forum.data.Thread.prototype.setTopic = function(newTopic) {
    var oldTopic = this.topic;
    if(oldTopic != Forum.Controller.specialDeletedID &&
       oldTopic != Forum.Controller.specialModeratedID)
        oldTopic.subtThread(this.count);

    this.topic = newTopic;
    if(newTopic != Forum.Controller.specialDeletedID &&
       newTopic != Forum.Controller.specialModeratedID)
        newTopic.addThread(this.count);
};

Forum.data.Thread.prototype.getLatestPost = function() {
    // Try to find a post to use for "last post in this thread by..."
    // functionality in html/thread or whatever.
    // Start by seeing if we have a descendant with the ID of
    // this.latestPost. This'll probably work,
    // unless that post was deleted, in which case we'll get a null.
    if(! this.latestPost) return null;
    var p = this.getDescendant(this.latestPost);
    if(p) return p;

    // Oh well, let's start proceeding backwards through all replies.
    // We should always find something -- the first post in a thread always
    // exists, even if it's been deleted.
    var reps = this.getReplies();
    for(var i = reps.length - 1; i >= 0; i--){
        if(reps[i])
            return reps[i];
    }
    log.app.forum.error("couldn't find the last post for "+ this._id);
    return null;
}

Forum.data.Thread.prototype.modifyPostCount = function(num){
    this.count += num;
    this.topic.changeCounts(0, num);
    this.save();
};

// Posts have a deleted field; this field is either false, meaning
// this post isn't deleted, or it is one of:
// the string "deleted"
// the string "moderated"
Forum.data.Thread.prototype.removePost = function(reason, desc_id){
    var p = this.getDescendant(desc_id);
    p.deleted = reason;

    if(this.latestPost == desc_id){
        var reps = this.getReplies();
        for(var i = reps.length - 1; i >= 0; --i){
            if(! reps[i].deleted){
                break;
            }
        }
        this.latestPost = reps[i].getID();
        this.lastPostTime = new Date(reps[i].ts.getTime());
    }

    this.save();
    this.saveDescendant(p);
    this.modifyPostCount(-1);
};

Forum.data.Thread.prototype.addPost = function(reason, desc_id){
    var p = this.getDescendant(desc_id);
    if(p.deleted == reason){
        p.deleted = false;

        if(p.ts > this.lastPostTime){
            this.lastPostTime = new Date(p.ts.getTime());
            this.latestPost = p.getID();
        }

        this.modifyPostCount(1);
        this.save();
        this.saveDescendant(p);
    }
};

Forum.data.Thread.prototype.recalculate = function() {
    var reps = this.getReplies();
    reps = reps.filter(function(r) { return ! r.deleted; });
    this.count = reps.length;
    this.save();
};

Forum.data.Thread.prototype.isExpired = function(){
    var days = Ext.getlist(allowModule, 'forum', 'threadExpirationDays');
    if(! days) return false;
    var end = new Date(this.created.getTime() + days * 24 * 60 * 60 * 1000 );
    return new Date() > end;
};

Forum.data.Thread.prototype.postable = function(){
    return this.commentsEnabled && ! this.isExpired();
};

// This adds children and the rendering thereof to the Thread class.
// For more on this, check corejs/threaded/_init.js.
// A bunch of functions are added to the Thread class -- getReplies(),
// decoratorsRender(), decoratorsHandle().
core.threaded.data.reply_children();
threaded.repliesEnabled(Forum.data, "Thread",
                        {style: "children", users: "auth",
                         tablename: "forum.posts", replyable: false,
                         pieces: Forum.root.html
                                                  });

Forum.data.Thread.list = function(topic){
    return db.forum.threads.find({topic: topic}).sort({pinned: -1, lastPostTime: -1});
};

db.forum.threads.setConstructor(Forum.data.Thread);

db.forum.threads.ensureIndex({created : -1});
db.forum.threads.ensureIndex({lastPostTime : -1});
db.forum.threads.ensureIndex({pinned: 1});
db.forum.threads.ensureIndex({pinned: 1, lastPostTime: 1});
core.db.dbutil();
dbutil.associate(Forum.data.Thread, db.forum.threads);
Search.fixTable(db.forum.threads, Forum.data.Thread.prototype.SEARCH_WEIGHTS);
