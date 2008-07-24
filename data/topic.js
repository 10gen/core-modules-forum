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
 * Data class for a forum topic.
 * Topics "contain" threads and other topics. This "owning" is done by setting
 * the "parent" attribute to some other topic.
 */
Forum.data.Topic = function(){
    this.name = "";
    this.description = "";
    this.hidden = false;
    this.allowPosts = true;
    this.order = 0;

    // Housekeeping fields
    this.latestPost = null;
    this.parent = null;
    this.postCount = 0;
    this.threadCount = 0;
    this.postCountJustThis = 0;
    this.threadCountJustThis = 0;
    this.clean = false;

};

/**
 * Set the order of the topic as an integer. Lower orders come first.
 * @param {number} o the position for this topic to have
 */
Forum.data.Topic.prototype.setOrder = function(o) {
    this.order = o;
};

/**
 * Gets the ancestor topics for this topic, topmost first.
 * In other words: get the root of the topic tree, followed by the child of
 * the root, and so on until we get to this topic. (Include this topic.)
 * @return {Array} the ancestors for this topic
 */
Forum.data.Topic.prototype.getAncestors = function() {
    var i = 0;
    var topicStack = [];
    tempTopic = this;
    do {
        topicStack[i++] = tempTopic.name;
        tempTopic = tempTopic.parent;
    } while(tempTopic != null);
    return topicStack.reverse();
};

/**
 * Get the number of threads in this topic and all subtopics.
 * @return {number} the number of threads
 */
Forum.data.Topic.prototype.getThreadCount = function() {
    count = db.forum.threads.find( { topic : this } ).toArray.length;
    subtopics = db.forum.topic.find( { parent : this } );
    for(var i=0; i < subtopics.length; i++) {
        count += subtopics[i].getThreadCount();
    }
    return count;
};

Forum.data.Topic.prototype.SEARCH_OPTIONS = {
    name: 1,
    description: 1
};

/**
 * Check whether this topic is hidden. A topic is hidden if it is marked hidden
 * with its "hidden" attribute, or if its parent is hidden.
 * @return {boolean} true if this topic is hidden
 */
Forum.data.Topic.prototype.getHidden = function(){
    return this.hidden || (this.parent && this.parent.getHidden());
};

/**
 * Presave hook for a topic. Index a topic's name and description.
 */
Forum.data.Topic.prototype.presave = function(){
    if ( ! this.description ||
         "null" == this.description )
        this.description = "";

    Search.index(this, this.SEARCH_OPTIONS);
};

/**
 * Modify a topic's thread count and post count. Percolates through the
 * ancestors of this topic modifying all of their counts too.
 * @param {number} threadCount the number to increment thread counts by
 * @param {number} postCount the number to increment post counts by
 */
Forum.data.Topic.prototype.changeCounts = function(threadCount, postCount){
    var topic = this;
    while(topic){
        topic.postCount += postCount;
        topic.threadCount += threadCount;
        topic = topic.parent;
    }
    db.forum.topics.save(this);
};

/**
 * Set the parent topic for this topic.
 * Updates thread/post counts correctly.
 * @param {Forum.data.Topic} a topic
 */
Forum.data.Topic.prototype.setParent = function(topic){
    if(this.parent)
        this.parent.changeCounts(-this.threadCount, -this.postCount);
    if(topic)
        topic.changeCounts(this.threadCount, this.postCount);
    this.parent = topic;
};

/**
 * "Subtract" a thread from this topic.
 * Used when a thread is marked as no longer belonging to this topic.
 * Removes a thread's counts from this topic's counts.
 * @param {number} postCount the number of posts in the departed thread
 */
Forum.data.Topic.prototype.subtThread = function(postCount){
    this.threadCountJustThis -= 1;
    this.changeCounts(-1, -postCount);
};

/**
 * "Add" a thread to this topic.
 * Used when a thread is newly added to this topic.
 * Add a thread's counts to this topic's counts.
 * @param {number} postCount the number of posts in the arriving thread
 */
Forum.data.Topic.prototype.addThread = function(postCount){
    this.threadCountJustThis += 1;
    this.changeCounts(1, postCount);
};

/**
 * Math is hard, so let's redo all of it.
 * Recalculates the thread and post counts for everything in the forum.
 */
Forum.data.Topic.prototype.recalculateAll = function(){
    this.threadCount = 0;
    this.postCount = 0;
    this.threadCountJustThis = 0;
    this.postCountJustThis = 0;

    var threads = db.forum.threads.find( { topic : this } ).toArray();
    this.threadCountJustThis = threads.length;
    for(var i=0; i < threads.length; i++){
        var thread = threads[i];
        thread.recalculate();
        this.postCountJustThis += thread.count;
    }

    this.threadCount = this.threadCountJustThis;
    this.postCount = this.postCountJustThis;

    subtopics = db.forum.topics.find( { parent : this } ).toArray();
    for(var i=0; i < subtopics.length; i++) {
        var subtopic = subtopics[i];
        subtopic.recalculateAll();
        this.postCount += subtopic.postCount;
        this.threadCount += subtopic.threadCount;
    }

    db.forum.topics.save(this);

};

/**
 * Lists the topics in a parent topic.
 * @param {Forum.data.Topic} parent the topic whose children we're looking for
 * @param {boolean} showHidden true if we should return hidden topics
 * @return a cursor to the topics belonging to the given topic
 */
Forum.data.Topic.list = function(parent, showHidden){
    var q = {parent: parent};
    if(! showHidden) q.hidden = false;
    return db.forum.topics.find(q).sort({order: 1});
};


db.forum.topics.setConstructor(Forum.data.Topic);
db.forum.topics.ensureIndex({order: 1});
