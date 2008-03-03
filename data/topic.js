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
};

Forum.data.Topic.prototype.presave = function(){
    if ( ! this.description ||
         "null" == this.description )
        this.description = "";
};

Forum.data.Topic.prototype.changeCounts = function(threadCount, postCount){
    var topic = this;
    while(topic){
        topic.postCount += postCount;
        topic.threadCount += threadCount;
        db.forum.topics.save(topic);
        topic = topic.parent;
    }
};

Forum.data.Topic.prototype.subtThread = function(postCount){
    this.changeCounts(-1, -postCount);
};

Forum.data.Topic.prototype.addThread = function(postCount){
    this.changeCounts(1, postCount);
};

Forum.data.Topic.list = function(parent){
    return db.forum.topics.find({parent: parent}).sort({order: 1});
};

db.forum.topics.setConstructor(Forum.data.Topic);
db.forum.topics.ensureIndex({order: 1});