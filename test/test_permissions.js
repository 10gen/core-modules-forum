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

db = connect("tests");
db.forum.banned_ips.remove({});

core.testing.client();

c = new testing.Client();
c.setAnswer("output");

var output = c.execute(function(){
    Forum.root.index();
});

assert(! (output.match(/onclick="newTopic\(/)));

var output = c.withPermission("Forum.root.admin", function(){
    Forum.root.index();
});

assert(output.match(/onclick="newTopic\(/));

db.forum.banned_ips.save({ip: "127.0.0.1"});

var output = c.execute(Forum.root.index);

assert(output.match(/You have been banned!/));


db.forum.banned_ips.remove({});
