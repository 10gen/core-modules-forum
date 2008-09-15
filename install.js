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

var options = arguments[0] || {};

// FIXME: Bet I could combine all these getdefault calls into a single Object.extend
options.threadExpirationDays = Ext.getdefault(options, 'threadExpirationDays', 45);
options.needStatuses = Ext.getdefault(options, 'needStatuses', ['confirmed_email']);
options.subtopics = Ext.getdefault(options, 'subtopics', true);
options.threadName = Ext.getdefault(options, 'threadName', 'thread');
options.allowSubtopics = Ext.getdefault(options, 'allowSubtopics', true);
options.showTopicPostCount = Ext.getdefault(options, 'showTopicPostCount', false);

addModule('forum', options);

User.requirements.confirmed_email.push("forum");

return Forum;
