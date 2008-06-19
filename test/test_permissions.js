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
