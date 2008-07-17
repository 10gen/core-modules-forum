var options = arguments[0] || {};

options.threadExpirationDays = Ext.getdefault(options, 'threadExpirationDays', 45);
options.needStatuses = Ext.getdefault(options, 'needStatuses', ['confirmed_email']);

addModule('forum', options);

User.requirements.confirmed_email.push("forum");

return Forum;
