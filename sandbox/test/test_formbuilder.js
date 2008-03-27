db = connect('tests');  // stupid workaround for threaded needing the DB

core.sandbox.formbuilder();

FormBuilder = sandbox.FormBuilder;

var qw = function(s){ return s.trim().split(/\s+/); };

print(qw('  a b c').length);

var form = new FormBuilder({
    fields: qw('name gender email'),
    attr: {action: "form_handler"},
    action: "form_handler",
});

form.field('name', {gender: qw('male female')});

