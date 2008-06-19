log.app.forum.info("Running forum.controller"+app + Forum);
Forum.Controller = {};

Forum.Controller.bannedUser = function(user, request){
    if(db.forum.banned_users.findOne({user: user})) return true;
    if(db.forum.banned_ips.findOne({ip: request.getRemoteIP()})) return true;
    return false;
};

Forum.Controller.unknownPermissions = function(){
    return {viewTopicNonHidden: true, viewThreadNonHidden: true};
};

Forum.Controller.memberPermissions = function(){
    var p = {createThread: true,
        makePost: true
            };
    // add anonymousPermissions
    return Object.extend(p, Forum.Controller.unknownPermissions());
};

Forum.Controller.moderatorPermissions = function(){
    var p = {
        moderatePost: true,
        viewModerated: true,
        viewSpecialTopic_Moderated: true
    };

    // add memberPermissions
    return Object.extend(p, Forum.Controller.memberPermissions());
};

Forum.Controller.adminPermissions = function(){
    var p = {
        // user stuff
        banUser: true,
        banIP: true,
        editUser: true,

        // post stuff
        editPost: true,
        deletePost: true,
        movePost: true, splitPost: true,

        // topic stuff
        createTopic: true, renameTopic: true,
        moveTopic: true, deleteTopic: true,
        hideTopic: true,
        viewTopicHidden: true,

        // thread stuff
        editThread: true,
        moveThread: true,
        deleteThread: true,
        moderateThread: true,
        stickyThread: true,
        edPickThread: true,

        // restore deleted posts
        viewDeleted: true,
        viewSpecialTopic_Deleted: true,

        // this can DoS the forum
        recalculateCounts: true
    };
    // add moderator permissions
    return Object.extend(p, Forum.Controller.moderatorPermissions());
};

globalCachedPermissions = {};
Forum.Controller.hasPermission = function(user, perm){
    var id = null;
    if(user == null)
        id = request.getRemoteIP();
    else
        id = user._id.toString();

    if(! globalCachedPermissions[id]){
        globalCachedPermissions[id] = Forum.Controller.getPermissions(user);
    }

    return (perm in globalCachedPermissions[id]);
};

Forum.Controller.getPermissions = function(user){
    // FIXME: throw an exception if we find a banned user? We should be
    // handling all of these at the page level.
    if(user == null || Forum.Controller.bannedUser(user, request)){
        // treat user as anonymous
        return (Forum.Controller.unknownPermissions());
    }

    // if type == "MEMBER" we go to Forum.Controller.memberPermissions,
    // if type == "MODERATOR" we go to ...moderatorPermissions,
    // etc. So we do a lookup; use the type to find the right function, and call
    // it. If the permission is in the returned object, return true.
    var type = Forum.Controller.userPermissionType(user);
    return Forum.Controller[type.toLowerCase()+'Permissions']();
};

Forum.Controller.getAllPostsDeletedByUser_Query = function(user){
    return db.forum.posts.find({deleted: user});
};

// Special ObjectIds to refer to the special "deleted" and "moderated" topics.
Forum.Controller.specialDeletedID = ObjectId("00000000000000000000001");
Forum.Controller.specialModeratedID = ObjectId("00000000000000000000002");

Forum.Controller.permissions = {
    ADMIN: "Forum.root.admin",
    MODERATOR: "Forum.root.moderator",
    MEMBER: "Forum.root.member",
    UNKNOWN: "Forum.root.unknown",

};

Forum.Controller.missingPermission = function(user){
    if(! user) return "account";

    statuses = Ext.getlist(allowModule, "forum", "needStatuses");
    if(statuses){
        for(var i in statuses){
            if(! user.hasPermission(statuses[i]))
                return statuses[i];
        }
    }
    return false;
};

Forum.Controller.userPermissionType = function(user){
    if(! user) return "UNKNOWN";

    for(var key in Forum.Controller.permissions){
        if(user.hasPermission(Forum.Controller.permissions[key]))
            return key;
    }

    // OK, we better guess
    if(user.isAdmin())
        return "ADMIN";
    if(Forum.Controller.missingPermission(user))
        return "UNKNOWN";
    return "MEMBER";
};

Forum.Controller.canPost = function(thread){
    return Forum.Controller.hasPermission(user, "makePost")
        && thread.commentsEnabled && thread.postable();
};
