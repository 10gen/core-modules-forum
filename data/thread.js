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

/**
 * Data class for a forum thread.
 */
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

/**
 * Presave hook: index this thread.
 */
Forum.data.Thread.prototype.presave = function() {
    Search.index( this , this.SEARCH_WEIGHTS, this.SEARCH_OPTIONS );
    Search.addToIndex( this, content.HTML.strip(this.getReplies()[0].title), 0.2);
};

/**
 * Get the title for this thread.
 * @return {string} the title for this thread
 */
Forum.data.Thread.prototype.getTitle = function() {
    return this.getFirstPost().title;
};

/**
 * Set the title for this thread.
 * @param {string} title the new title for this thread
 */
Forum.data.Thread.prototype.setTitle = function(title){
    this.getFirstPost().title = title;
};

/**
 * Set whether this thread is closed, that is, whether comments are disabled
 * on this thread.
 * @param {boolean} isClosed true if this thread should be closed
 */
Forum.data.Thread.prototype.setClosed = function(isClosed){
    this.commentsEnabled = !isClosed;
};

/**
 * Check whether this thread is closed, that is, whether comments are disabled
 * on this thread.
 * @return {boolean} true if this thread is closed
 */
Forum.data.Thread.prototype.getClosed = function(isClosed){
    return !this.commentsEnabled;
};

/**
 * Check whether this thread is hidden.
 * @return {boolean} true if this thread is hidden
 */
Forum.data.Thread.prototype.getHidden = function(){
    return this.topic.getHidden();
};

/**
 * Get the first post in this thread.
 * @return {threaded.Reply} the first post in this thread
 */
Forum.data.Thread.prototype.getFirstPost = function(){
    return this.getReplies()[0];
};

/**
 * Get the first post in this thread that isn't deleted.
 * @return {threaded.Reply} the first post in this thread that isn't deleted
 */
Forum.data.Thread.prototype.getFirstNotDeleted = function(){
    var notdeleted = function(p) { if (p.deleted) return false; return true; };
    var reps = this.getReplies();

    for(var i = 0; i < reps.length; i++){
        if(notdeleted(reps[i])){ return reps[i]; }
    }
    return null;
};

/**
 * Set the topic to which this thread belongs.
 * @param {Forum.data.Topic} newTopic the topic for this post
 */
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

/**
 * Try to find a post to use for "last post in this thread by..." functionality.
 * @return {threaded.Reply} the most recent post
 */
Forum.data.Thread.prototype.getLatestPost = function() {
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

/**
 * Modify the post count for this thread. Convenience method for changing
 * this thread's post count and the post counts for all ancestor topics.
 * @param {number} num the amount to increase/decrease the post count
 */
Forum.data.Thread.prototype.modifyPostCount = function(num){
    this.count += num;
    this.topic.changeCounts(0, num);
    this.save();
};

// Posts have a deleted field; this field is either false, meaning
// this post isn't deleted, or it is one of:
// the string "deleted"
// the string "moderated"
/**
 * Mark a post as "removed" from the thread.
 * @param {string} reason a "type" of deletion, either "deleted" or "moderated"
 * @param {string} comment the comment ID to remove
 */
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

/**
 * Un-remove a post from this thread.
 * @param {string} reason the "type" of deletion to undo: "deleted" or "moderated". If the post wasn't deleted in this way, we ignore the request.
 * @param {string} comment the comment ID to un-remove
 */
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

/**
 * Math is hard, so do it over.
 * Recount the number of non-deleted posts in this thread.
 */
Forum.data.Thread.prototype.recalculate = function() {
    var reps = this.getReplies();
    reps = reps.filter(function(r) { return ! r.deleted; });
    this.count = reps.length;
    this.save();
};

/**
 * Check whether this thread is expired.
 * A site can configure whether a thread expires; expired threads cannot be
 * posted to.
 * @return {boolean} true if this thread is expired
 */
Forum.data.Thread.prototype.isExpired = function(){
    var days = Ext.getlist(allowModule, 'forum', 'threadExpirationDays');
    if(! days) return false;
    var end = new Date(this.created.getTime() + days * 24 * 60 * 60 * 1000 );
    return new Date() > end;
};

/**
 * Check whether this thread is accepting comments.
 * @return {boolean} true if this thread accepts comments
 */
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

/**
 * Get all the threads in a certain topic.
 * @param {Forum.data.Topic} topic the topic to find threads in
 * @return cursor to threads in the given topic, in sorted order
 */
Forum.data.Thread.list = function(topic){
    return db.forum.threads.find({topic: topic}).sort({pinned: -1, lastPostTime: -1});
};

Forum.data.Thread.prototype.validateReply = function(reply){
    if(Ext.getlist(allowModule, 'forum', 'akismet', 'key')){
        var a = new ws.akismet.Akismet(allowModule.forum.akismet.key,
            allowModule.forum.akismet.uri);
        var key = a.verifyKey();
        if( ! key ){
            reply.failed = "Checking the reply with Akismet failed: invalid key.";
            return false;
        }
        var result = a.commentCheck( reply.ip, reply.useragent, reply.author_name , reply.content_unescaped, reply.author_email , reply.author_url );
        if( ! result ){
            if( allowModule.forum.akismet.failMessage ){
                reply.failed = allowMoule.forum.akismet.failMessage;
            }
            else
                reply.failed = "Your comment has been rejected as spam.";
            return false;
        }
    }
    return true;
};

db.forum.threads.setConstructor(Forum.data.Thread);

db.forum.threads.ensureIndex({created : -1});
db.forum.threads.ensureIndex({lastPostTime : -1});
db.forum.threads.ensureIndex({pinned: 1});
db.forum.threads.ensureIndex({pinned: 1, lastPostTime: 1});
core.db.dbutil();
dbutil.associate(Forum.data.Thread, db.forum.threads);
Search.fixTable(db.forum.threads, Forum.data.Thread.prototype.SEARCH_WEIGHTS);
