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

log.app.forum.info("Running forum.controller"+app + Forum);
/** Master class for the forum.
 */
Forum.Controller = {};

/**
 * Check whether a request or a user is banned.
 * @return true if they're banned (as a user or as an IP)
 */
Forum.Controller.bannedUser = function(user, request){
    if(db.forum.banned_users.findOne({user: user})) return true;
    if(db.forum.banned_ips.findOne({ip: request.getRemoteIP()})) return true;
    return false;
};

/**
 * Get the permissions for an "unknown user".
 * @return a mapping of action name -> true if an unknown user is allowed
 *   to perform that action
 */
Forum.Controller.unknownPermissions = function(){
    return {viewTopicNonHidden: true, viewThreadNonHidden: true};
};

/**
 * Get the permissions for a member -- that is, someone who is logged in as a
 * real user. Includes all permissions for an unknown user.
 * @return a mapping of action name -> true if a member is allowed to perform
 *    that action
 */
Forum.Controller.memberPermissions = function(){
    var p = {createThread: true,
        makePost: true
            };
    // add anonymousPermissions
    return Object.extend(p, Forum.Controller.unknownPermissions());
};

/**
 * Get the permissions for a moderator -- that is, someone who was granted
 * the forum moderator permission. Includes all the permissions for an ordinary
 * member.
 * @return a mapping of action name -> true if a moderator is allowed to perform
 *    that action
 */
Forum.Controller.moderatorPermissions = function(){
    var p = {
        moderatePost: true,
        viewModerated: true,
        viewSpecialTopic_Moderated: true
    };

    // add memberPermissions
    return Object.extend(p, Forum.Controller.memberPermissions());
};

/**
 * Get the permissions for an admin -- that is, someone who has the forum admin
 * permission. Site admins are "grandfathered" in as forum admins.
 * @return a mapping of action name -> true if a forum admin is allowed to
 *    perform that action
 */
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
/**
 * Check whether a user has the given permission. User permissions are cached
 * (FIXME: use a timeout cache) so as to minimize database lookups.
 * @param {User} user a user object
 * @param {string} perm a forum permission
 * @return true if the user has that permission
 */
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

/**
 * Look up the permissions for a single user.
 * @param {User} user a user
 * @return a mapping of action name -> true if the user can perform this action
 */
Forum.Controller.getPermissions = function(user){
    // FIXME: throw an exception if we find a banned user? We should be
    // handling all of these at the page level.
    if(user == null || Forum.Controller.bannedUser(user, request)){
        // treat user as anonymous
        return (Forum.Controller.unknownPermissions());
    }

    // FIXME: using global request object here
    if( db.banned_ips.findOne({ip: request.getRemoteIP()}) ){
        return Forum.Controller.unknownPermissions();
    }

    // if type == "MEMBER" we go to Forum.Controller.memberPermissions,
    // if type == "MODERATOR" we go to ...moderatorPermissions,
    // etc. So we do a lookup; use the type to find the right function, and call
    // it. If the permission is in the returned object, return true.
    var type = Forum.Controller.userPermissionType(user);
    return Forum.Controller[type.toLowerCase()+'Permissions']();
};

/**
 * Gets all the posts deleted by a user.
 * @param {User} user a user
 * @return a cursor pointing to all posts that were deleted by that user
 */
Forum.Controller.getAllPostsDeletedByUser_Query = function(user){
    return db.forum.posts.find({deleted: user});
};

// Special ObjectIds to refer to the special "deleted" and "moderated" topics.
Forum.Controller.specialDeletedID = ObjectId("00000000000000000000001");
Forum.Controller.specialModeratedID = ObjectId("00000000000000000000002");

/**
 * The types of permissions we recognize in the forum. These are
 * "ADMIN", "MODERATOR", "MEMBER", and "UNKNOWN". This mapping holds these and
 * the corresponding user permissions.
 */
Forum.Controller.permissions = {
    ADMIN: "Forum.root.admin",
    MODERATOR: "Forum.root.moderator",
    MEMBER: "Forum.root.member",
    UNKNOWN: "Forum.root.unknown",

};
/**
 * Check if a user has all the prerequisites to use the forum.
 * @param {User} user a user object
 * @return false if nothing is missing; otherwise return the string for the
 *   first user permission the user needs
 */
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

/**
 * Return a descriptive string specifying what kind of permissions a user has.
 * @see Forum.Controller.permissions
 * @param {User} user a user object
 * @return {string} one of the Forum permissions
 */
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

/**
 * Check whether the current user can post to a thread.
 * @param {Forum.data.Thread} thread a thread
 * @return true if the user has permission to post to this thread and it's OK
 *   to post to this thread
 */
Forum.Controller.canPost = function(thread){
    return Forum.Controller.hasPermission(user, "makePost")
        && thread.commentsEnabled && thread.postable();
};
